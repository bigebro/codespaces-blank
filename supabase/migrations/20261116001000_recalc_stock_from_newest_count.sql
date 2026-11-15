CREATE OR REPLACE FUNCTION public.recalc_ingredient_stock(ingredient_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  latest_qty numeric;
  latest_at timestamptz;
  movement numeric;
BEGIN
  IF ingredient_id IS NULL THEN
    RETURN;
  END IF;

  SELECT inventory_logs.quantity, inventory_logs.date
  INTO latest_qty, latest_at
  FROM public.inventory_logs
  WHERE inventory_logs.ingredient_id = recalc_ingredient_stock.ingredient_id
    AND inventory_logs.type = 'count'
  ORDER BY inventory_logs.date DESC, inventory_logs.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(inventory_logs.quantity), 0)
  INTO movement
  FROM public.inventory_logs
  WHERE inventory_logs.ingredient_id = recalc_ingredient_stock.ingredient_id
    AND inventory_logs.type IS DISTINCT FROM 'count'
    AND inventory_logs.date > latest_at;

  UPDATE public.ingredients
  SET current_stock = latest_qty + movement,
      last_counted_at = latest_at
  WHERE id = recalc_ingredient_stock.ingredient_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ingredient_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ing uuid;
  seen uuid[] := ARRAY[]::uuid[];
  target uuid;
  has_count boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    seen := ARRAY[NEW.ingredient_id];
  ELSIF TG_OP = 'DELETE' THEN
    seen := ARRAY[OLD.ingredient_id];
  ELSE
    seen := ARRAY[OLD.ingredient_id];
    IF NEW.ingredient_id IS DISTINCT FROM OLD.ingredient_id THEN
      seen := seen || NEW.ingredient_id;
    END IF;
  END IF;

  FOREACH target IN ARRAY seen
  LOOP
    ing := target;
    IF ing IS NULL THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.inventory_logs
      WHERE inventory_logs.ingredient_id = ing
        AND inventory_logs.type = 'count'
    ) INTO has_count;

    IF has_count THEN
      PERFORM public.recalc_ingredient_stock(ing);
    ELSIF TG_OP = 'INSERT' AND NEW.ingredient_id = ing AND NEW.type IS DISTINCT FROM 'count' THEN
      UPDATE public.ingredients
      SET current_stock = COALESCE(current_stock, 0) + COALESCE(NEW.quantity, 0)
      WHERE id = ing;
    ELSIF TG_OP = 'DELETE' AND OLD.ingredient_id = ing AND OLD.type IS DISTINCT FROM 'count' THEN
      UPDATE public.ingredients
      SET current_stock = COALESCE(current_stock, 0) - COALESCE(OLD.quantity, 0)
      WHERE id = ing;
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.ingredient_id = ing AND OLD.type IS DISTINCT FROM 'count' THEN
        UPDATE public.ingredients
        SET current_stock = COALESCE(current_stock, 0) - COALESCE(OLD.quantity, 0)
        WHERE id = ing;
      END IF;
      IF NEW.ingredient_id = ing AND NEW.type IS DISTINCT FROM 'count' THEN
        UPDATE public.ingredients
        SET current_stock = COALESCE(current_stock, 0) + COALESCE(NEW.quantity, 0)
        WHERE id = ing;
      END IF;
    END IF;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_stock ON public.inventory_logs;
CREATE TRIGGER trg_update_stock
  AFTER INSERT OR DELETE OR UPDATE ON public.inventory_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ingredient_stock();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    REVOKE ALL ON FUNCTION public.recalc_ingredient_stock(uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.recalc_ingredient_stock(uuid) TO authenticated, service_role;
  END IF;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT inventory_logs.ingredient_id AS id
    FROM public.inventory_logs
    WHERE inventory_logs.type = 'count'
      AND inventory_logs.ingredient_id IS NOT NULL
  LOOP
    PERFORM public.recalc_ingredient_stock(r.id);
  END LOOP;
END $$;
