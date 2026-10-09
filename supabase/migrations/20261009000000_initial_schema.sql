


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_current_client_id"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_client_id text;
BEGIN
  -- Түрүүлж profiles хүснэгтээс бодит нэрийг авна:
  SELECT client_id INTO v_client_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  
  IF v_client_id IS NULL OR v_client_id = '' THEN
    SELECT raw_user_meta_data->>'client_id' INTO v_client_id FROM auth.users WHERE id = auth.uid();
  END IF;

  RETURN COALESCE(v_client_id, 'SF Coffee');
END;
$$;


ALTER FUNCTION "public"."get_current_client_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_client TEXT;
    user_role TEXT;
BEGIN
    new_client := COALESCE(NEW.raw_user_meta_data->>'client_id', 'SF Coffee');
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'owner');

    INSERT INTO public.profiles (id, email, client_id, role, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        new_client,
        user_role,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Ажилтан')
    );

    IF user_role = 'owner' AND new_client != 'SF Coffee' THEN
        PERFORM public.seed_new_client_defaults(new_client);
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_new_client_defaults"("target_client_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- 1. Түүхий эдийг хуулах (Үлдэгдэл 0-тэйгээр)
    INSERT INTO public.ingredients (client_id, name, unit, unit_price, current_stock, is_critical, par_level, lead_time_days, days_of_supply)
    SELECT target_client_id, name, unit, unit_price, 0.00, is_critical, par_level, lead_time_days, days_of_supply
    FROM public.ingredients
    WHERE client_id = 'SF Coffee'
    ON CONFLICT (client_id, name) DO NOTHING;

    -- 2. 💡 ШИНЭЭР НЭМСЭН: Бүтээгдэхүүний зарах үнэ ба Менюг хуулах
    INSERT INTO public.products (client_id, name, category, selling_price)
    SELECT target_client_id, name, category, selling_price
    FROM public.products
    WHERE client_id = 'SF Coffee'
    ON CONFLICT (client_id, name) DO NOTHING;

    -- 3. Жорыг шинэ түүхий эдийн ID-тай холбож хуулах
    INSERT INTO public.recipes (client_id, product_name, ingredient_id, amount)
    SELECT 
        target_client_id, 
        r.product_name, 
        new_ing.id, 
        r.amount
    FROM public.recipes r
    JOIN public.ingredients old_ing ON r.ingredient_id = old_ing.id
    JOIN public.ingredients new_ing ON new_ing.client_id = target_client_id AND new_ing.name = old_ing.name
    WHERE r.client_id = 'SF Coffee'
    ON CONFLICT (client_id, product_name, ingredient_id) DO NOTHING;

    -- 4. Албан тушаалуудыг үүсгэх
    INSERT INTO public.company_roles (client_id, role_name)
    VALUES 
        (target_client_id, 'Бариста ☕'),
        (target_client_id, 'Тогооч 🍳')
    ON CONFLICT (client_id, role_name) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."seed_new_client_defaults"("target_client_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ingredient_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.type = 'count') THEN
            UPDATE public.ingredients
            SET current_stock = NEW.quantity,
                last_counted_at = NOW()
            WHERE id = NEW.ingredient_id;
        ELSE
            UPDATE public.ingredients
            SET current_stock = current_stock + NEW.quantity
            WHERE id = NEW.ingredient_id;
        END IF;
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.type = 'count') THEN
            -- Тооллого устгахад үлдэгдэл өөрчлөгдөхгүй
        ELSE
            UPDATE public.ingredients
            SET current_stock = current_stock - OLD.quantity
            WHERE id = OLD.ingredient_id;
        END IF;
        RETURN OLD;

    ELSIF (TG_OP = 'UPDATE') THEN
        IF (NEW.type = 'count') THEN
            UPDATE public.ingredients
            SET current_stock = NEW.quantity,
                last_counted_at = NOW()
            WHERE id = NEW.ingredient_id;
        ELSE
            UPDATE public.ingredients
            SET current_stock = current_stock - OLD.quantity + NEW.quantity
            WHERE id = NEW.ingredient_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_ingredient_stock"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."client_settings" (
    "client_id" "text" NOT NULL,
    "initial_cash" numeric DEFAULT 0.00 NOT NULL,
    "initial_bank" numeric DEFAULT 0.00 NOT NULL,
    "tax_mode" "text" DEFAULT 'auto'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "category_margins" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."client_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "role_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."company_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fixed_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "category" "text" DEFAULT 'Тоног төхөөрөмж'::"text",
    "purchase_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "initial_cost" numeric DEFAULT 0.00 NOT NULL,
    "useful_months" integer DEFAULT 60 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."fixed_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fixed_opex" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" DEFAULT 'Тогтмол зардал'::"text",
    "monthly_cost" numeric DEFAULT 0.00 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."fixed_opex" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ingredients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "unit" character varying(50) NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0.00,
    "current_stock" numeric(10,2) DEFAULT 0.00,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "client_id" "text" DEFAULT 'SF Coffee'::"text" NOT NULL,
    "lead_time_days" integer DEFAULT 1 NOT NULL,
    "days_of_supply" integer DEFAULT 3 NOT NULL,
    "par_level" numeric DEFAULT 0.00 NOT NULL,
    "is_critical" boolean DEFAULT false NOT NULL,
    "last_counted_at" timestamp with time zone DEFAULT '2000-01-01 00:00:00+00'::timestamp with time zone,
    "abc_category" "text" DEFAULT 'C'::"text",
    "is_suspicious_promoted" boolean DEFAULT false,
    "promoted_until" timestamp with time zone
);


ALTER TABLE "public"."ingredients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "type" character varying(100) NOT NULL,
    "ingredient_id" "uuid",
    "quantity" numeric(10,2) NOT NULL,
    "total_cost" numeric(12,2) DEFAULT 0.00,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "non_food_item" character varying(255) DEFAULT NULL::character varying,
    "client_id" "text" DEFAULT 'SF Coffee'::"text" NOT NULL,
    "worker_name" "text" DEFAULT 'Үл мэдэгдэх'::"text",
    "payment_method" "text" DEFAULT 'bank'::"text",
    "is_ebarimt" boolean DEFAULT true,
    "image_url" "text",
    "incident_type" "text" DEFAULT 'normal'::"text",
    "reported_against_worker" "text"
);


ALTER TABLE "public"."inventory_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learned_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "phrase" "text" NOT NULL,
    "ingredient_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."learned_aliases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learned_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "product_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."learned_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learned_menus" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "pos_name" "text" NOT NULL,
    "official_product_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."learned_menus" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learned_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "original_text" "text" NOT NULL,
    "translated_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."learned_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" DEFAULT 'SF Coffee'::"text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" DEFAULT 'COFFEE'::"text",
    "selling_price" numeric DEFAULT 0.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "client_id" "text" DEFAULT 'SF Coffee'::"text" NOT NULL,
    "role" "text" DEFAULT 'owner'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "telegram_chat_id" bigint,
    "email" "text",
    "full_name" "text",
    "salary_type" "text" DEFAULT 'hourly'::"text",
    "base_rate" numeric DEFAULT 6500,
    "pin_code" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "product_name" "text" NOT NULL,
    "action" "text" DEFAULT 'updated'::"text" NOT NULL,
    "ingredients_snapshot" "jsonb" NOT NULL,
    "author" "text" DEFAULT 'Админ'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."recipe_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_name" character varying(255) NOT NULL,
    "ingredient_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "client_id" "text" DEFAULT 'SF Coffee'::"text" NOT NULL
);


ALTER TABLE "public"."recipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "product_name" character varying(255) NOT NULL,
    "quantity_sold" integer NOT NULL,
    "total_revenue" numeric(12,2) DEFAULT 0.00,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "client_id" "text" DEFAULT 'SF Coffee'::"text" NOT NULL,
    "payment_method" "text" DEFAULT 'bank'::"text"
);


ALTER TABLE "public"."sales_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "telegram_chat_id" bigint NOT NULL,
    "start_time" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "end_time" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "closing_checklist" "jsonb" DEFAULT '[]'::"jsonb",
    "character_role" "text" DEFAULT 'General'::"text",
    "daily_tasks_checklist" "jsonb" DEFAULT '[]'::"jsonb",
    "earned_xp" integer DEFAULT 0,
    "start_notes" "text",
    "start_evidence_image" "text",
    "pos_z_image_url" "text",
    "closing_variance_score" numeric DEFAULT 100
);


ALTER TABLE "public"."shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" DEFAULT 'SF Coffee'::"text" NOT NULL,
    "role" "text" NOT NULL,
    "task_name" "text" NOT NULL,
    "weight" integer DEFAULT 10,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


ALTER TABLE ONLY "public"."client_settings"
    ADD CONSTRAINT "client_settings_pkey" PRIMARY KEY ("client_id");



ALTER TABLE ONLY "public"."company_roles"
    ADD CONSTRAINT "company_roles_client_id_role_name_key" UNIQUE ("client_id", "role_name");



ALTER TABLE ONLY "public"."company_roles"
    ADD CONSTRAINT "company_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fixed_assets"
    ADD CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fixed_opex"
    ADD CONSTRAINT "fixed_opex_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learned_aliases"
    ADD CONSTRAINT "learned_aliases_client_id_phrase_key" UNIQUE ("client_id", "phrase");



ALTER TABLE ONLY "public"."learned_aliases"
    ADD CONSTRAINT "learned_aliases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learned_categories"
    ADD CONSTRAINT "learned_categories_client_id_product_name_key" UNIQUE ("client_id", "product_name");



ALTER TABLE ONLY "public"."learned_categories"
    ADD CONSTRAINT "learned_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learned_menus"
    ADD CONSTRAINT "learned_menus_client_id_pos_name_key" UNIQUE ("client_id", "pos_name");



ALTER TABLE ONLY "public"."learned_menus"
    ADD CONSTRAINT "learned_menus_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learned_translations"
    ADD CONSTRAINT "learned_translations_client_id_original_text_key" UNIQUE ("client_id", "original_text");



ALTER TABLE ONLY "public"."learned_translations"
    ADD CONSTRAINT "learned_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_client_id_name_key" UNIQUE ("client_id", "name");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_telegram_chat_id_key" UNIQUE ("telegram_chat_id");



ALTER TABLE ONLY "public"."recipe_snapshots"
    ADD CONSTRAINT "recipe_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_logs"
    ADD CONSTRAINT "sales_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "unique_ingredient_per_client" UNIQUE ("client_id", "name");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "unique_product_per_client" UNIQUE ("client_id", "name");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "unique_recipe_item_per_client" UNIQUE ("client_id", "product_name", "ingredient_id");



ALTER TABLE ONLY "public"."company_roles"
    ADD CONSTRAINT "unique_role_per_client" UNIQUE ("client_id", "role_name");



CREATE INDEX "idx_ingredients_client" ON "public"."ingredients" USING "btree" ("client_id");



CREATE INDEX "idx_inventory_logs_client_date" ON "public"."inventory_logs" USING "btree" ("client_id", "date");



CREATE INDEX "idx_products_client" ON "public"."products" USING "btree" ("client_id");



CREATE INDEX "idx_recipes_client" ON "public"."recipes" USING "btree" ("client_id");



CREATE INDEX "idx_sales_logs_client_date" ON "public"."sales_logs" USING "btree" ("client_id", "date");



CREATE INDEX "idx_shifts_client_time" ON "public"."shifts" USING "btree" ("client_id", "start_time");



CREATE OR REPLACE TRIGGER "trg_update_stock" AFTER INSERT OR DELETE OR UPDATE ON "public"."inventory_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_ingredient_stock"();



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."learned_aliases"
    ADD CONSTRAINT "learned_aliases_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all on learned_aliases" ON "public"."learned_aliases" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on learned_categories" ON "public"."learned_categories" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on learned_menus" ON "public"."learned_menus" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on learned_translations" ON "public"."learned_translations" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Isolate ingredients by tenant" ON "public"."ingredients" TO "authenticated", "anon" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Isolate recipe_snapshots" ON "public"."recipe_snapshots" TO "authenticated" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Isolate shifts by tenant" ON "public"."shifts" TO "authenticated", "anon" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Isolate tasks by tenant" ON "public"."tasks" TO "authenticated", "anon" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Tenant isolate client_settings" ON "public"."client_settings" TO "authenticated" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Tenant isolate company_roles" ON "public"."company_roles" TO "authenticated" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Tenant isolate fixed_assets" ON "public"."fixed_assets" TO "authenticated" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Tenant isolate fixed_opex" ON "public"."fixed_opex" TO "authenticated" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Tenant isolate inventory_logs" ON "public"."inventory_logs" TO "authenticated" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Tenant isolate products" ON "public"."products" TO "authenticated" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Tenant isolate recipes" ON "public"."recipes" TO "authenticated" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Tenant isolate sales_logs" ON "public"."sales_logs" TO "authenticated" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Tenant profiles delete" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Tenant profiles insert" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((("client_id" = "public"."get_current_client_id"()) OR ("id" = "auth"."uid"())));



CREATE POLICY "Tenant profiles select" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Tenant profiles update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("client_id" = "public"."get_current_client_id"())) WITH CHECK (("client_id" = "public"."get_current_client_id"()));



CREATE POLICY "Users can only update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."client_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fixed_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fixed_opex" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ingredients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learned_aliases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learned_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learned_menus" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learned_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."get_current_client_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_client_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_client_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_new_client_defaults"("target_client_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_new_client_defaults"("target_client_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_new_client_defaults"("target_client_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ingredient_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ingredient_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ingredient_stock"() TO "service_role";


















GRANT ALL ON TABLE "public"."client_settings" TO "anon";
GRANT ALL ON TABLE "public"."client_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."client_settings" TO "service_role";



GRANT ALL ON TABLE "public"."company_roles" TO "anon";
GRANT ALL ON TABLE "public"."company_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."company_roles" TO "service_role";



GRANT ALL ON TABLE "public"."fixed_assets" TO "anon";
GRANT ALL ON TABLE "public"."fixed_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."fixed_assets" TO "service_role";



GRANT ALL ON TABLE "public"."fixed_opex" TO "anon";
GRANT ALL ON TABLE "public"."fixed_opex" TO "authenticated";
GRANT ALL ON TABLE "public"."fixed_opex" TO "service_role";



GRANT ALL ON TABLE "public"."ingredients" TO "anon";
GRANT ALL ON TABLE "public"."ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_logs" TO "anon";
GRANT ALL ON TABLE "public"."inventory_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_logs" TO "service_role";



GRANT ALL ON TABLE "public"."learned_aliases" TO "anon";
GRANT ALL ON TABLE "public"."learned_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."learned_aliases" TO "service_role";



GRANT ALL ON TABLE "public"."learned_categories" TO "anon";
GRANT ALL ON TABLE "public"."learned_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."learned_categories" TO "service_role";



GRANT ALL ON TABLE "public"."learned_menus" TO "anon";
GRANT ALL ON TABLE "public"."learned_menus" TO "authenticated";
GRANT ALL ON TABLE "public"."learned_menus" TO "service_role";



GRANT ALL ON TABLE "public"."learned_translations" TO "anon";
GRANT ALL ON TABLE "public"."learned_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."learned_translations" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."recipe_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."recipes" TO "anon";
GRANT ALL ON TABLE "public"."recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."recipes" TO "service_role";



GRANT ALL ON TABLE "public"."sales_logs" TO "anon";
GRANT ALL ON TABLE "public"."sales_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_logs" TO "service_role";



GRANT ALL ON TABLE "public"."shifts" TO "anon";
GRANT ALL ON TABLE "public"."shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."shifts" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































