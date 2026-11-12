-- Phase 0: close the live anon policies after kiosk writes move to the service role.
-- Policies are dropped by what they allow, because the live names are not in the repo snapshot.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (
          tablename IN ('ingredients', 'inventory_logs', 'recipes', 'shifts', 'tasks')
          AND (
            COALESCE(qual, '') IN ('true', '(true)')
            OR COALESCE(with_check, '') IN ('true', '(true)')
            OR 'anon' = ANY (roles)
            OR 'public' = ANY (roles)
          )
        )
        OR (
          tablename = 'kiosk_devices'
          AND (
            COALESCE(qual, '') IN ('true', '(true)')
            OR COALESCE(with_check, '') IN ('true', '(true)')
          )
        )
        OR (tablename = 'tenants' AND ('anon' = ANY (roles) OR 'public' = ANY (roles)))
        OR (
          tablename = 'payment_requests'
          AND cmd = 'INSERT'
          AND (
            'anon' = ANY (roles)
            OR 'public' = ANY (roles)
            OR COALESCE(with_check, '') IN ('true', '(true)')
          )
        )
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ingredients' AND policyname = 'tenant_ingredients_auth') THEN
    CREATE POLICY tenant_ingredients_auth ON public.ingredients
      FOR ALL TO authenticated
      USING (client_id = public.get_current_client_id())
      WITH CHECK (client_id = public.get_current_client_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_logs' AND policyname = 'tenant_inventory_logs_auth') THEN
    CREATE POLICY tenant_inventory_logs_auth ON public.inventory_logs
      FOR ALL TO authenticated
      USING (client_id = public.get_current_client_id())
      WITH CHECK (client_id = public.get_current_client_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recipes' AND policyname = 'tenant_recipes_auth') THEN
    CREATE POLICY tenant_recipes_auth ON public.recipes
      FOR ALL TO authenticated
      USING (client_id = public.get_current_client_id())
      WITH CHECK (client_id = public.get_current_client_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shifts' AND policyname = 'tenant_shifts_auth') THEN
    CREATE POLICY tenant_shifts_auth ON public.shifts
      FOR ALL TO authenticated
      USING (client_id = public.get_current_client_id())
      WITH CHECK (client_id = public.get_current_client_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tenant_tasks_auth') THEN
    CREATE POLICY tenant_tasks_auth ON public.tasks
      FOR ALL TO authenticated
      USING (client_id = public.get_current_client_id())
      WITH CHECK (client_id = public.get_current_client_id());
  END IF;
  IF to_regclass('public.kiosk_devices') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kiosk_devices' AND policyname = 'tenant_kiosk_devices_auth') THEN
    CREATE POLICY tenant_kiosk_devices_auth ON public.kiosk_devices
      FOR ALL TO authenticated
      USING (client_id = public.get_current_client_id())
      WITH CHECK (client_id = public.get_current_client_id());
  END IF;
  IF to_regclass('public.tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'Owner view tenants') THEN
    CREATE POLICY "Owner view tenants" ON public.tenants
      FOR SELECT TO authenticated
      USING (
        client_id = public.get_current_client_id()
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'owner'
        )
      );
  END IF;
  IF to_regclass('public.payment_requests') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payment_requests' AND policyname = 'tenant_payment_requests_insert') THEN
    CREATE POLICY tenant_payment_requests_insert ON public.payment_requests
      FOR INSERT TO authenticated
      WITH CHECK (client_id = public.get_current_client_id());
  END IF;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_kiosk_staff',
        'handle_new_user',
        'seed_new_client_defaults',
        'rls_auto_enable',
        'protect_profile_role_and_client'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.block_client_pin_writes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF TG_OP = 'INSERT' AND NEW.pin_code IS NOT NULL THEN
      RAISE EXCEPTION 'PIN can only be changed by the server';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.pin_code IS DISTINCT FROM OLD.pin_code THEN
      RAISE EXCEPTION 'PIN can only be changed by the server';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_client_pin_writes ON public.profiles;
CREATE TRIGGER block_client_pin_writes
  BEFORE INSERT OR UPDATE OF pin_code ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.block_client_pin_writes();

CREATE OR REPLACE FUNCTION public.block_future_inventory_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.date IS NOT NULL AND NEW.date > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Ирээдүйн огноо зөвшөөрөгдөхгүй';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_future_inventory_date ON public.inventory_logs;
CREATE TRIGGER block_future_inventory_date
  BEFORE INSERT OR UPDATE OF date ON public.inventory_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.block_future_inventory_date();
