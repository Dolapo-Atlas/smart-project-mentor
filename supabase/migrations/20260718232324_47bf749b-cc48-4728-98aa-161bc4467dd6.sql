ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status = ANY (ARRAY['todo','in_progress','blocked','submitted','approved','done','dismissed','archived']));
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS dismissal_reason text,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;