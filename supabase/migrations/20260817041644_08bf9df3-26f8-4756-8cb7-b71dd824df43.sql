ALTER TYPE gate_phase ADD VALUE IF NOT EXISTS 'monitoring';
ALTER TYPE gate_phase ADD VALUE IF NOT EXISTS 'go-live';

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS artifact_type text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reviewer_name text,
  ADD COLUMN IF NOT EXISTS review_feedback jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.project_artifacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE,
  artifact_type text NOT NULL,
  title text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_latest boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_markdown text,
  simulated_role text,
  project_name text,
  source_table text,
  source_id uuid,
  reviewer_name text,
  review_result jsonb,
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_instance_id, artifact_type, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_artifacts TO authenticated;
GRANT ALL ON public.project_artifacts TO service_role;

ALTER TABLE public.project_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners manage their own project artifacts"
  ON public.project_artifacts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS project_artifacts_scope_idx
  ON public.project_artifacts (user_id, project_instance_id, artifact_type, version DESC);

CREATE TRIGGER project_artifacts_touch_updated_at
  BEFORE UPDATE ON public.project_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();