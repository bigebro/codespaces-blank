-- Phase 4 settings stay on client_settings, which already isolates rows by client_id.
-- No new table. Cup check stays off until the owner turns it on.

ALTER TABLE public.client_settings
  ADD COLUMN IF NOT EXISTS cup_check_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cup_ingredient_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS team_goal jsonb NOT NULL DEFAULT '{}'::jsonb;
