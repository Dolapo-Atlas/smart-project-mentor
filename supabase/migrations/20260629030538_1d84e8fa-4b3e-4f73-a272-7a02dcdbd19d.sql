
CREATE TABLE public.ai_eval_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suite TEXT NOT NULL,
  total INT NOT NULL DEFAULT 0,
  passed INT NOT NULL DEFAULT 0,
  avg_score NUMERIC(4,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_eval_runs TO authenticated;
GRANT ALL ON public.ai_eval_runs TO service_role;
ALTER TABLE public.ai_eval_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own eval runs" ON public.ai_eval_runs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_eval_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.ai_eval_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL,
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  expected TEXT NOT NULL,
  score INT NOT NULL,
  passed BOOLEAN NOT NULL,
  judge_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_eval_results TO authenticated;
GRANT ALL ON public.ai_eval_results TO service_role;
ALTER TABLE public.ai_eval_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own eval results" ON public.ai_eval_results
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX ai_eval_results_run_idx ON public.ai_eval_results(run_id);
CREATE INDEX ai_eval_runs_user_idx ON public.ai_eval_runs(user_id, created_at DESC);
