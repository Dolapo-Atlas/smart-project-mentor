
CREATE TABLE public.user_competencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competency_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked','drafting','mastered')),
  unlocked_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, competency_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_competencies TO authenticated;
GRANT ALL ON public.user_competencies TO service_role;
ALTER TABLE public.user_competencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own competencies" ON public.user_competencies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_competencies_touch BEFORE UPDATE ON public.user_competencies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.reflection_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase INTEGER,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reflection_entries TO authenticated;
GRANT ALL ON public.reflection_entries TO service_role;
ALTER TABLE public.reflection_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reflections" ON public.reflection_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
