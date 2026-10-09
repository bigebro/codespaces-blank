-- 1. client_settings хүснэгтэд баганууд нэмэх
ALTER TABLE public.client_settings ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.client_settings ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '{}'::jsonb;

-- 2. Логоны bucket үүсгэх ба Public болгох
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand_assets', 'brand_assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

UPDATE storage.buckets SET public = true WHERE id = 'receipts_evidence';

-- 3. Storage-ийн аюулгүй байдлыг цэвэрлэх
DROP POLICY IF EXISTS "Allow all on storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Public view storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload storage objects" ON storage.objects;

-- Зургийг хэн ч уншиж харах эрх (SELECT - Public)
CREATE POLICY "Public view storage objects"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('receipts_evidence', 'brand_assets'));

-- Зөвхөн нэвтэрсэн хэрэглэгч зураг оруулах, засах эрх (INSERT, UPDATE)
CREATE POLICY "Authenticated upload storage objects"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id IN ('receipts_evidence', 'brand_assets'))
WITH CHECK (bucket_id IN ('receipts_evidence', 'brand_assets'));

-- 4. client_settings-ийн нууцлалыг хадгалах (Санхүүгийн тоог өөр салбарт харуулахгүй!)
DROP POLICY IF EXISTS "Tenant isolate client_settings" ON public.client_settings;
DROP POLICY IF EXISTS "Allow select client_settings" ON public.client_settings;

CREATE POLICY "Tenant isolate client_settings" 
ON public.client_settings
FOR ALL 
TO authenticated 
USING (client_id = get_current_client_id())
WITH CHECK (client_id = get_current_client_id());

-- 5. ⚡ УРТ ХУГАЦААНЫ ТӨГС ШИЙДЭЛ: Kiosk таблет санхүүгийн нууцад хүрэхгүйгээр ЗӨВХӨН ЛОГО-г авах аюулгүй функц
CREATE OR REPLACE FUNCTION public.get_kiosk_branding(target_client_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'client_id', client_id,
    'logo_url', logo_url
  ) INTO v_result
  FROM public.client_settings
  WHERE client_id ILIKE target_client_id
  LIMIT 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_kiosk_branding(text) TO anon, authenticated;