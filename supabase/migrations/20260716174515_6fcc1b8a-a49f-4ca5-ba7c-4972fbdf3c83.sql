
CREATE TABLE public.project_charters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE,
  linked_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  completion_pct int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','changes_requested')),
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','changes_requested')),
  sponsor_comment text,
  version int NOT NULL DEFAULT 1,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_instance_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_charters TO authenticated;
GRANT ALL ON public.project_charters TO service_role;

ALTER TABLE public.project_charters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own charters"
  ON public.project_charters FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER project_charters_touch
  BEFORE UPDATE ON public.project_charters
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER project_charters_fill_instance
  BEFORE INSERT ON public.project_charters
  FOR EACH ROW EXECUTE FUNCTION public.fill_project_instance_id();

CREATE TABLE public.project_charter_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charter_id uuid NOT NULL REFERENCES public.project_charters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version int NOT NULL,
  payload jsonb NOT NULL,
  completion_pct int NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.project_charter_versions TO authenticated;
GRANT ALL ON public.project_charter_versions TO service_role;

ALTER TABLE public.project_charter_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own charter versions"
  ON public.project_charter_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own charter versions"
  ON public.project_charter_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX project_charter_versions_charter_idx
  ON public.project_charter_versions (charter_id, version DESC);
