-- Tasks 1, 3, 6, 9, 10, 11, 16, 18

CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION public.protect_profile_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.client_id IS DISTINCT FROM OLD.client_id THEN
      RAISE EXCEPTION 'role and client_id can only be changed by the server';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_identity ON public.profiles;
CREATE TRIGGER profiles_protect_identity
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_identity();

CREATE TABLE IF NOT EXISTS public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  email text,
  phone text,
  role text NOT NULL CHECK (role IN ('manager', 'staff')),
  invited_by uuid,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  invoice_id text UNIQUE,
  sender_invoice_no text,
  amount numeric NOT NULL,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  qpay_payment_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  supplier_name text NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kiosk_attempts (
  id bigserial PRIMARY KEY,
  device_key text NOT NULL,
  kind text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kiosk_attempts_lookup ON public.kiosk_attempts (device_key, kind, created_at);

ALTER TABLE public.shifts ALTER COLUMN telegram_chat_id DROP NOT NULL;

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
  invite_role text;
BEGIN
  SELECT * INTO invite
  FROM public.staff_invites
  WHERE accepted_at IS NULL
    AND expires_at > now()
    AND (
      (email IS NOT NULL AND lower(email) = lower(NEW.email))
      OR (phone IS NOT NULL AND phone = NULLIF(trim(NEW.raw_user_meta_data->>'phone'), ''))
    )
  ORDER BY created_at DESC
  LIMIT 1;

  IF invite.id IS NOT NULL THEN
    invite_role := CASE WHEN invite.role IN ('manager', 'staff') THEN invite.role ELSE 'staff' END;
    INSERT INTO public.profiles (id, email, client_id, role, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      invite.client_id,
      invite_role,
      COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), 'Ажилтан')
    );
    UPDATE public.staff_invites SET accepted_at = now() WHERE id = invite.id;
    RETURN NEW;
  END IF;

  new_client := NULLIF(trim(NEW.raw_user_meta_data->>'client_id'), '');
  IF new_client IS NULL THEN
    new_client := 'Shop_' || substr(replace(NEW.id::text, '-', ''), 1, 12);
  ELSIF new_client ~ '[%_]' THEN
    RAISE EXCEPTION 'Бизнесийн нэрт %% эсвэл _ тэмдэгт байж болохгүй';
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.tenants WHERE lower(client_id) = lower(new_client)
    ) INTO shop_exists;
    IF shop_exists THEN
      RAISE EXCEPTION 'Энэ бизнесийн нэр аль хэдийнэ бүртгэгдсэн байна!';
    END IF;
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

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts_evidence', 'receipts_evidence', false), ('brand_assets', 'brand_assets', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Public view storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Tenant read own storage" ON storage.objects;
DROP POLICY IF EXISTS "Tenant write own storage" ON storage.objects;

CREATE POLICY "Tenant read own storage"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('receipts_evidence', 'brand_assets')
  AND (storage.foldername(name))[1] = public.get_current_client_id()
);

CREATE POLICY "Tenant write own storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('receipts_evidence', 'brand_assets')
  AND (storage.foldername(name))[1] = public.get_current_client_id()
);

CREATE POLICY "Tenant update own storage"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('receipts_evidence', 'brand_assets')
  AND (storage.foldername(name))[1] = public.get_current_client_id()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner alerts" ON public.alerts;
CREATE POLICY "Owner alerts"
ON public.alerts FOR SELECT TO authenticated
USING (
  client_id = public.get_current_client_id()
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner invites" ON public.staff_invites;
CREATE POLICY "Owner invites"
ON public.staff_invites FOR SELECT TO authenticated
USING (
  client_id = public.get_current_client_id()
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
);

-- vector size used by match_ai_memory is 768. gemini-embedding-001 is requested at that size.
DO $$
BEGIN
  IF to_regclass('public.business_memory') IS NULL THEN
    RETURN;
  END IF;
  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.match_ai_memory(
      p_client_id text,
      p_query_embedding vector(768),
      p_match_count int,
      p_match_threshold float
    )
    RETURNS TABLE (id uuid, topic text, fact text, similarity float)
    LANGUAGE sql STABLE
    AS $body$
      SELECT id, topic, fact, 1 - (embedding <=> p_query_embedding) AS similarity
      FROM public.business_memory
      WHERE client_id = p_client_id
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> p_query_embedding) >= p_match_threshold
      ORDER BY embedding <=> p_query_embedding
      LIMIT p_match_count;
    $body$;
  $fn$;
END $$;
