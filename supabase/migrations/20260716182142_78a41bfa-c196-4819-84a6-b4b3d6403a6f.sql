
CREATE TABLE public.lessons_learned_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_instance_id UUID,
  linked_task_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  completion_pct INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  approval_status TEXT NOT NULL DEFAULT 'pending',
  sponsor_comment TEXT,
  version INT NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons_learned_docs TO authenticated;
GRANT ALL ON public.lessons_learned_docs TO service_role;

ALTER TABLE public.lessons_learned_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own lessons docs"
  ON public.lessons_learned_docs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER lessons_learned_docs_touch
  BEFORE UPDATE ON public.lessons_learned_docs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX lessons_learned_docs_user_idx ON public.lessons_learned_docs(user_id);

CREATE TABLE public.lessons_learned_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id UUID NOT NULL REFERENCES public.lessons_learned_docs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INT NOT NULL,
  payload JSONB NOT NULL,
  completion_pct INT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.lessons_learned_versions TO authenticated;
GRANT ALL ON public.lessons_learned_versions TO service_role;

ALTER TABLE public.lessons_learned_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lessons versions"
  ON public.lessons_learned_versions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own lessons versions"
  ON public.lessons_learned_versions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX lessons_learned_versions_doc_idx ON public.lessons_learned_versions(doc_id);
