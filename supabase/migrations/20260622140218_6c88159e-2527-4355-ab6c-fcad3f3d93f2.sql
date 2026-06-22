
ALTER TABLE public.simulation_state
  ADD COLUMN IF NOT EXISTS current_day integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_week integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_sprint integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_advanced_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_milestone text NOT NULL DEFAULT 'Steering Committee';
