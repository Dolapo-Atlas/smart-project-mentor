
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS linked_stakeholder text,
  ADD COLUMN IF NOT EXISTS linked_area text,
  ADD COLUMN IF NOT EXISTS linked_module_route text,
  ADD COLUMN IF NOT EXISTS completion_action text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref uuid,
  ADD COLUMN IF NOT EXISTS impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS depends_on uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS submission text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedback jsonb;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
    CHECK (status IN ('todo','in_progress','blocked','submitted','approved','done'));
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_priority_check
    CHECK (priority IN ('low','medium','high','critical'));

CREATE INDEX IF NOT EXISTS tasks_user_status_idx ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS tasks_source_ref_idx ON public.tasks(source_ref);
