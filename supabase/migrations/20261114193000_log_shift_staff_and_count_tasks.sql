-- Phase 1: who/which shift wrote a log, and one-shot count tasks.

ALTER TABLE public.inventory_logs
  ADD COLUMN IF NOT EXISTS shift_id uuid,
  ADD COLUMN IF NOT EXISTS staff_id uuid;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'checklist',
  ADD COLUMN IF NOT EXISTS ingredient_ids uuid[] DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_logs_shift_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_logs
      ADD CONSTRAINT inventory_logs_shift_id_fkey
      FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_logs_staff_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_logs
      ADD CONSTRAINT inventory_logs_staff_id_fkey
      FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
