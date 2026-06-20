
CREATE TYPE public.budget_kind AS ENUM ('planned','actual','invoice','forecast');
CREATE TYPE public.cr_status AS ENUM ('draft','submitted','approved','rejected');
CREATE TYPE public.cr_risk AS ENUM ('low','medium','high');
CREATE TYPE public.gate_status AS ENUM ('locked','open','passed','failed');
CREATE TYPE public.gate_phase AS ENUM ('initiation','planning','execution','closure');
CREATE TYPE public.meeting_kind AS ENUM ('standup','steering','vendor','retro');

CREATE TABLE public.status_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  rag_summary public.rag_status NOT NULL DEFAULT 'amber',
  achievements text,
  next_week text,
  risks_blockers text,
  ai_score integer,
  ai_feedback jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_reports TO authenticated;
GRANT ALL ON public.status_reports TO service_role;
ALTER TABLE public.status_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own status_reports" ON public.status_reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL,
  kind public.budget_kind NOT NULL,
  line_date date NOT NULL DEFAULT current_date,
  vendor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_lines TO authenticated;
GRANT ALL ON public.budget_lines TO service_role;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budget_lines" ON public.budget_lines
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  requested_by text NOT NULL,
  cost_impact numeric(12,2) NOT NULL DEFAULT 0,
  schedule_impact_days integer NOT NULL DEFAULT 0,
  risk_impact public.cr_risk NOT NULL DEFAULT 'medium',
  impact_assessment text,
  status public.cr_status NOT NULL DEFAULT 'submitted',
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_requests TO authenticated;
GRANT ALL ON public.change_requests TO service_role;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own change_requests" ON public.change_requests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.phase_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase public.gate_phase NOT NULL,
  status public.gate_status NOT NULL DEFAULT 'locked',
  score integer,
  feedback jsonb,
  opened_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, phase)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase_gates TO authenticated;
GRANT ALL ON public.phase_gates TO service_role;
ALTER TABLE public.phase_gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own phase_gates" ON public.phase_gates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.meeting_kind NOT NULL,
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  agenda text,
  decisions text,
  minutes text,
  ai_summary text,
  held boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own meetings" ON public.meetings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER status_reports_touch BEFORE UPDATE ON public.status_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER change_requests_touch BEFORE UPDATE ON public.change_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER phase_gates_touch BEFORE UPDATE ON public.phase_gates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER meetings_touch BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
