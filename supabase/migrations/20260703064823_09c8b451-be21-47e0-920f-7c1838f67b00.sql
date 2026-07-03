
CREATE TABLE public.workplace_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_key TEXT NOT NULL,
  tool_family TEXT NOT NULL,
  label TEXT NOT NULL,
  source TEXT,
  times_practised INTEGER NOT NULL DEFAULT 1,
  first_earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_practised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workplace_skills TO authenticated;
GRANT ALL ON public.workplace_skills TO service_role;

ALTER TABLE public.workplace_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own workplace skills"
ON public.workplace_skills FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX workplace_skills_user_idx ON public.workplace_skills(user_id);

CREATE TRIGGER workplace_skills_touch
BEFORE UPDATE ON public.workplace_skills
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
