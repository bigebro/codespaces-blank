-- Suggested only. Do not apply automatically in this QA round.
-- Same SQL as /workspace/qa4_index.sql
-- Speeds up logs.checkDuplicate / duplicatePurchase:
--   (client_id, ingredient_id, type, date) for type = 'purchase'.
--
-- Prefer CREATE INDEX CONCURRENTLY in a maintenance window if this file
-- would otherwise run inside a transaction.

CREATE INDEX IF NOT EXISTS idx_inventory_logs_purchase_dup
  ON public.inventory_logs (client_id, ingredient_id, type, date DESC)
  WHERE type = 'purchase';
