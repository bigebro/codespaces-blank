-- Security, billing, alerts, invites, and private storage.
-- Embedding width: text-embedding-004 (retired Jan 2026) stored 768-d vectors.
-- gemini-embedding-001 is requested at ai_memory_vector_dim() so match_ai_memory
-- keeps the same column. Re-embed with scripts/reembed-business-memory.mjs.
-- profiles.role keeps job names such as Бариста and Тогооч. Do not rewrite them.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

CREATE OR REPLACE FUNCTION public.protect_profile_role_and_client()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
      RAISE EXCEPTION 'client_id can only be changed by service_role';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role IN ('owner', 'manager') THEN
      RAISE EXCEPTION 'role owner or manager can only be set by service_role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_role_client ON public.profiles;
CREATE TRIGGER profiles_protect_role_client
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_role_and_client();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_code text;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE TABLE IF NOT EXISTS public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  email text,
  phone text,
  role text NOT NULL CHECK (role IN ('manager', 'staff')),
  token text UNIQUE NOT NULL,
  invited_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner reads invites" ON public.staff_invites;
CREATE POLICY "owner reads invites" ON public.staff_invites
FOR SELECT TO authenticated
USING (
  client_id = public.get_current_client_id()
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  new_client text;
  shop_exists boolean;
  invite public.staff_invites%ROWTYPE;
BEGIN
  SELECT * INTO invite
  FROM public.staff_invites
  WHERE accepted_at IS NULL
    AND (
      (
        NULLIF(trim(NEW.raw_user_meta_data->>'invite_token'), '') IS NOT NULL
        AND token = trim(NEW.raw_user_meta_data->>'invite_token')
      )
      OR (
        email IS NOT NULL
        AND lower(email) = lower(COALESCE(NEW.email, ''))
      )
    )
  ORDER BY
    CASE
      WHEN token = NULLIF(trim(NEW.raw_user_meta_data->>'invite_token'), '') THEN 0
      ELSE 1
    END,
    created_at DESC
  LIMIT 1;

  IF invite.id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, client_id, role, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      invite.client_id,
      invite.role,
      COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), 'Ажилтан')
    );
    UPDATE public.staff_invites SET accepted_at = now() WHERE id = invite.id;
    RETURN NEW;
  END IF;

  new_client := NULLIF(trim(NEW.raw_user_meta_data->>'client_id'), '');
  IF new_client IS NULL THEN
    new_client := 'Shop_' || substr(replace(NEW.id::text, '-', ''), 1, 12);
  END IF;

  IF new_client ~ '[%_\\]' THEN
    RAISE EXCEPTION 'Бизнесийн нэрд %% болон _ тэмдэгт оруулах боломжгүй.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.tenants WHERE lower(client_id) = lower(new_client)
  ) INTO shop_exists;

  IF shop_exists THEN
    RAISE EXCEPTION 'Энэ бизнесийн нэр аль хэдийнэ бүртгэгдсэн байна!';
  END IF;

  INSERT INTO public.profiles (id, email, client_id, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    new_client,
    'owner',
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), 'Эзэн')
  );

  INSERT INTO public.tenants (client_id, plan, status, subscription_end_date)
  VALUES (new_client, 'trial', 'active', now() + interval '14 days')
  ON CONFLICT (client_id) DO NOTHING;

  INSERT INTO public.client_settings (client_id, initial_cash, initial_bank, tax_mode)
  VALUES (new_client, 0, 0, 'auto')
  ON CONFLICT (client_id) DO NOTHING;

  INSERT INTO public.company_roles (client_id, role_name)
  VALUES (new_client, 'Бариста'), (new_client, 'Тогооч')
  ON CONFLICT (client_id, role_name) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  invoice_id text UNIQUE NOT NULL,
  sender_invoice_no text,
  amount numeric NOT NULL,
  plan text,
  period_days integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'pending',
  qpay_payment_id text,
  applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS plan text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS period_days integer NOT NULL DEFAULT 30;

CREATE TABLE IF NOT EXISTS public.agent_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

CREATE INDEX IF NOT EXISTS agent_alerts_client_idx ON public.agent_alerts (client_id, created_at DESC);
ALTER TABLE public.agent_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant reads alerts" ON public.agent_alerts;
CREATE POLICY "tenant reads alerts" ON public.agent_alerts
FOR SELECT TO authenticated
USING (client_id = public.get_current_client_id());

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  user_id uuid,
  endpoint text UNIQUE NOT NULL,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant suppliers" ON public.suppliers;
CREATE POLICY "tenant suppliers" ON public.suppliers
FOR ALL TO authenticated
USING (client_id = public.get_current_client_id())
WITH CHECK (client_id = public.get_current_client_id());

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  supplier_id uuid,
  status text NOT NULL DEFAULT 'draft',
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_cost numeric NOT NULL DEFAULT 0,
  sent_via text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant purchase orders" ON public.purchase_orders;
CREATE POLICY "tenant purchase orders" ON public.purchase_orders
FOR SELECT TO authenticated
USING (client_id = public.get_current_client_id());

CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id bigserial PRIMARY KEY,
  bucket text NOT NULL,
  subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_attempts_lookup ON public.auth_attempts (bucket, subject, created_at DESC);

CREATE OR REPLACE FUNCTION public.ai_memory_vector_dim()
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  dim integer;
BEGIN
  SELECT a.atttypmod INTO dim
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'business_memory'
    AND a.attname = 'embedding'
    AND NOT a.attisdropped;
  IF dim IS NULL OR dim <= 0 THEN
    RETURN 768;
  END IF;
  RETURN dim;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kiosk_branding(target_client_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF target_client_id IS NULL OR target_client_id ~ '[%_\\]' THEN
    RETURN '{}'::jsonb;
  END IF;
  SELECT jsonb_build_object('client_id', client_id, 'logo_url', logo_url)
  INTO v_result
  FROM public.client_settings
  WHERE client_id = target_client_id
  LIMIT 1;
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

UPDATE storage.buckets SET public = false WHERE id IN ('receipts_evidence', 'brand_assets');

DROP POLICY IF EXISTS "Public view storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Tenant read own storage" ON storage.objects;
DROP POLICY IF EXISTS "Tenant insert own storage" ON storage.objects;
DROP POLICY IF EXISTS "Tenant update own storage" ON storage.objects;
DROP POLICY IF EXISTS "Tenant delete own storage" ON storage.objects;

CREATE POLICY "Tenant read own storage" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id IN ('receipts_evidence', 'brand_assets')
  AND (storage.foldername(name))[1] = public.get_current_client_id()
);

CREATE POLICY "Tenant insert own storage" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('receipts_evidence', 'brand_assets')
  AND (storage.foldername(name))[1] = public.get_current_client_id()
);

CREATE POLICY "Tenant update own storage" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id IN ('receipts_evidence', 'brand_assets')
  AND (storage.foldername(name))[1] = public.get_current_client_id()
)
WITH CHECK (
  bucket_id IN ('receipts_evidence', 'brand_assets')
  AND (storage.foldername(name))[1] = public.get_current_client_id()
);

CREATE POLICY "Tenant delete own storage" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id IN ('receipts_evidence', 'brand_assets')
  AND (storage.foldername(name))[1] = public.get_current_client_id()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.verify_kiosk_pin(target_worker_id uuid, entered_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  stored text;
BEGIN
  IF entered_pin IS NULL OR btrim(entered_pin) = '' THEN
    RETURN false;
  END IF;

  SELECT pin_code INTO stored
  FROM public.profiles
  WHERE id = target_worker_id;

  IF stored IS NULL OR btrim(stored) = '' THEN
    RETURN false;
  END IF;

  RETURN stored = entered_pin;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_kiosk_pin(uuid, text) TO anon, authenticated, service_role;

