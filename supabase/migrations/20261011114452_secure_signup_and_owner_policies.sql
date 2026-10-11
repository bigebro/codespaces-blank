


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  new_client text;
  shop_exists boolean;
BEGIN
  new_client := NULLIF(trim(NEW.raw_user_meta_data->>'client_id'), '');

  IF new_client IS NULL THEN
    new_client := 'Shop_' || substr(replace(NEW.id::text, '-', ''), 1, 12);
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.tenants WHERE client_id ILIKE new_client
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

DROP POLICY IF EXISTS "Tenant isolate client_settings" ON public.client_settings;
DROP POLICY IF EXISTS "Owner only client_settings" ON public.client_settings;
CREATE POLICY "Owner only client_settings"
ON public.client_settings FOR ALL TO authenticated
USING (
  client_id = get_current_client_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  )
)
WITH CHECK (
  client_id = get_current_client_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  )
);

DROP POLICY IF EXISTS "Tenant isolate fixed_opex" ON public.fixed_opex;
DROP POLICY IF EXISTS "Owner only fixed_opex" ON public.fixed_opex;
CREATE POLICY "Owner only fixed_opex"
ON public.fixed_opex FOR ALL TO authenticated
USING (
  client_id = get_current_client_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  )
)
WITH CHECK (
  client_id = get_current_client_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  )
);

DROP POLICY IF EXISTS "Tenant isolate fixed_assets" ON public.fixed_assets;
DROP POLICY IF EXISTS "Owner only fixed_assets" ON public.fixed_assets;
CREATE POLICY "Owner only fixed_assets"
ON public.fixed_assets FOR ALL TO authenticated
USING (
  client_id = get_current_client_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  )
)
WITH CHECK (
  client_id = get_current_client_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  )
);

DROP POLICY IF EXISTS "Tenants view own data" ON public.tenants;
DROP POLICY IF EXISTS "Owner view tenants" ON public.tenants;
CREATE POLICY "Owner view tenants"
ON public.tenants FOR SELECT TO authenticated
USING (
  client_id = get_current_client_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  )
);