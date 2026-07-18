
ALTER TABLE public.status_reports
  ADD COLUMN IF NOT EXISTS decisions_needed text,
  ADD COLUMN IF NOT EXISTS budget_note text,
  ADD COLUMN IF NOT EXISTS evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.reflection_entries
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS trigger_kind text;

CREATE INDEX IF NOT EXISTS reflection_entries_task_id_idx ON public.reflection_entries(task_id);
