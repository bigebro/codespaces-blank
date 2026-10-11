-- =========================================================================
-- 1. "SF COFFEE" ГЭСЭН АНХДАГЧ (DEFAULT) УТГЫГ БҮХ ХҮСНЭГТЭЭС УСТГАХ
-- (Үүнээс хойш алдаатай, client_id-гүй өгөгдөл орохыг хатуу хориглоно)
-- =========================================================================
ALTER TABLE public.ingredients ALTER COLUMN client_id DROP DEFAULT;
ALTER TABLE public.products ALTER COLUMN client_id DROP DEFAULT;
ALTER TABLE public.recipes ALTER COLUMN client_id DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN client_id DROP DEFAULT;
ALTER TABLE public.inventory_logs ALTER COLUMN client_id DROP DEFAULT;
ALTER TABLE public.sales_logs ALTER COLUMN client_id DROP DEFAULT;
ALTER TABLE public.tasks ALTER COLUMN client_id DROP DEFAULT;

-- =========================================================================
-- 2. GET_CURRENT_CLIENT_ID() ФУНКЦИЙГ ЗАСАХ
-- (Хэрэв хэрэглэгч олдохгүй бол автоматаар 'SF Coffee' рүү үсэрдгийг болиулах)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_current_client_id()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_client_id text;
BEGIN
  -- 1. Түрүүлж profiles хүснэгтээс бодит нэрийг авна:
  SELECT client_id INTO v_client_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  
  -- 2. Хэрэв олдохгүй бол auth.users-ээс авна
  IF v_client_id IS NULL OR v_client_id = '' THEN
    SELECT raw_user_meta_data->>'client_id' INTO v_client_id FROM auth.users WHERE id = auth.uid();
  END IF;

  -- 🚨 ХУУЧИН: RETURN COALESCE(v_client_id, 'SF Coffee');
  -- ✅ ШИНЭ: Зөвхөн олдсоныг нь буцаана, олдохгүй бол NULL буцааж хандалтыг тас хаана.
  RETURN v_client_id;
END;
$$;

-- =========================================================================
-- 3. AI-ИЙН СУРСАН ӨГӨГДЛҮҮДИЙГ ХАРИЛЦАГЧДААР НЬ ТАС ЦООЖЛОХ (SECURITY PATCH)
-- (USING (true) байсныг устгаж, зөвхөн тухайн салбарынхан л уншиж/засдаг болгох)
-- =========================================================================

-- А. Learned Aliases
DROP POLICY IF EXISTS "Allow all on learned_aliases" ON public.learned_aliases;
CREATE POLICY "Tenant isolate learned_aliases" ON public.learned_aliases 
FOR ALL TO authenticated 
USING (client_id = get_current_client_id()) WITH CHECK (client_id = get_current_client_id());

-- Б. Learned Categories
DROP POLICY IF EXISTS "Allow all on learned_categories" ON public.learned_categories;
CREATE POLICY "Tenant isolate learned_categories" ON public.learned_categories 
FOR ALL TO authenticated 
USING (client_id = get_current_client_id()) WITH CHECK (client_id = get_current_client_id());

-- В. Learned Menus
DROP POLICY IF EXISTS "Allow all on learned_menus" ON public.learned_menus;
CREATE POLICY "Tenant isolate learned_menus" ON public.learned_menus 
FOR ALL TO authenticated 
USING (client_id = get_current_client_id()) WITH CHECK (client_id = get_current_client_id());

-- Г. Learned Translations
DROP POLICY IF EXISTS "Allow all on learned_translations" ON public.learned_translations;
CREATE POLICY "Tenant isolate learned_translations" ON public.learned_translations 
FOR ALL TO authenticated 
USING (client_id = get_current_client_id()) WITH CHECK (client_id = get_current_client_id());


-- =========================================================================
-- 4. SAAS СИСТЕМИЙН ЗҮРХ: "TENANTS" (ТҮРЭЭСЛЭГЧИД) ХҮСНЭГТИЙГ ҮҮСГЭХ
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    client_id text PRIMARY KEY,
    plan text DEFAULT 'trial',                  -- trial, professional, enterprise
    status text DEFAULT 'active',               -- active, past_due, canceled
    subscription_end_date timestamptz,          -- Эрх дуусах хугацаа
    feature_flags jsonb DEFAULT '{}'::jsonb,    -- Тухайн харилцагчийн тусгай тохиргоонууд
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- Tenants хүснэгтийн аюулгүй байдал:
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 1. Хэрэглэгч зөвхөн өөрийн байгууллагын төлөв, эрхийг л харах боломжтой
CREATE POLICY "Tenants view own data" 
ON public.tenants FOR SELECT 
TO authenticated
USING (client_id = get_current_client_id());

-- 2. Харин нэмэх, засах эрхийг нь нээхгүй! Учир нь QPay төлбөр төлөгдсөний дараа зөвхөн 
-- серверийн админ эрхтэй (supabaseAdmin) API нь автоматаар сунгалт хийх ёстой.

-- Одоо байгаа салбаруудыг автоматаар Tenants руу бүртгэж 14 хоногийн туршилттайгаар оруулах:
INSERT INTO public.tenants (client_id, plan, status, subscription_end_date)
SELECT DISTINCT client_id, 'trial', 'active', (now() + interval '14 days')
FROM public.client_settings
ON CONFLICT (client_id) DO NOTHING;