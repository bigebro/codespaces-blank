CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_stock numeric(10,2) DEFAULT 0,
  last_counted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid REFERENCES public.ingredients(id),
  type text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

\ir ../supabase/migrations/20261116001000_recalc_stock_from_newest_count.sql

DO $$
DECLARE
  ing uuid;
  stock numeric;
BEGIN
  INSERT INTO public.ingredients (current_stock) VALUES (0) RETURNING id INTO ing;

  INSERT INTO public.inventory_logs (ingredient_id, type, quantity, date, created_at)
  VALUES (ing, 'count', 20, '2026-11-10T12:00:00Z', '2026-11-16T01:00:00Z');

  INSERT INTO public.inventory_logs (ingredient_id, type, quantity, date, created_at)
  VALUES (ing, 'count', 5, '2026-11-01T12:00:00Z', '2026-11-16T02:00:00Z');

  SELECT current_stock INTO stock FROM public.ingredients WHERE id = ing;
  IF stock <> 20 THEN
    RAISE EXCEPTION 'older count overwrote newer stock: %', stock;
  END IF;

  INSERT INTO public.inventory_logs (ingredient_id, type, quantity, date, created_at)
  VALUES (ing, 'purchase', 4, '2026-11-12T12:00:00Z', '2026-11-16T03:00:00Z');
  SELECT current_stock INTO stock FROM public.ingredients WHERE id = ing;
  IF stock <> 24 THEN
    RAISE EXCEPTION 'purchase after the newest count was not added: %', stock;
  END IF;

  DELETE FROM public.inventory_logs
  WHERE ingredient_id = ing AND type = 'purchase';
  SELECT current_stock INTO stock FROM public.ingredients WHERE id = ing;
  IF stock <> 20 THEN
    RAISE EXCEPTION 'deleted purchase did not lower stock: %', stock;
  END IF;

  RAISE NOTICE 'stock trigger checks passed';
END $$;
