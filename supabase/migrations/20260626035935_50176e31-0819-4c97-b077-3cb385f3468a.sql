CREATE TABLE public.performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  score_delivery integer NOT NULL,
  score_stakeholder integer NOT NULL,
  score_decision integer NOT NULL,
  overall_score integer NOT NULL,
  narrative text NOT NULL,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewer_name text NOT NULL DEFAULT 'Emma Collins',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_reviews TO authenticated;
GRANT ALL ON public.performance_reviews TO service_role;

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own performance reviews"
ON public.performance_reviews
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_perf_review_instance
BEFORE INSERT ON public.performance_reviews
FOR EACH ROW EXECUTE FUNCTION public.fill_project_instance_id();

CREATE TABLE public.team_dynamics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE,
  stakeholder_a text NOT NULL,
  stakeholder_b text NOT NULL,
  tension_score integer NOT NULL DEFAULT 0,
  last_event text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_dynamics TO authenticated;
GRANT ALL ON public.team_dynamics TO service_role;

ALTER TABLE public.team_dynamics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own team dynamics"
ON public.team_dynamics
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_team_dynamics_instance
BEFORE INSERT ON public.team_dynamics
FOR EACH ROW EXECUTE FUNCTION public.fill_project_instance_id();

CREATE TRIGGER touch_team_dynamics
BEFORE UPDATE ON public.team_dynamics
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();