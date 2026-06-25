
CREATE TABLE public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  duration_days integer NOT NULL,
  difficulty text NOT NULL,
  stakeholder_count integer NOT NULL,
  key_skills text[] NOT NULL DEFAULT '{}',
  icon text NOT NULL DEFAULT 'briefcase',
  is_recommended boolean NOT NULL DEFAULT false,
  is_playable boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.project_templates TO authenticated;
GRANT ALL ON public.project_templates TO service_role;

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates readable by authenticated users"
  ON public.project_templates FOR SELECT TO authenticated USING (true);

CREATE TRIGGER project_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.project_templates
  (slug, title, category, description, duration_days, difficulty, stakeholder_count, key_skills, icon, is_recommended, is_playable, sort_order) VALUES
  ('digital-care-records', 'Digital Care Records Rollout', 'Healthcare',
   'Lead the rollout of a new digital care records system across multiple clinics.',
   7, 'Beginner', 12, ARRAY['Stakeholder Mgmt','RAID Logs','Budget Control'], 'heart-pulse', true, true, 1),
  ('crm-implementation', 'CRM Implementation Project', 'Business Systems',
   'Oversee the implementation of a new CRM system for a mid-size company.',
   10, 'Beginner', 15, ARRAY['Vendor Mgmt','UAT','Change Requests'], 'briefcase', false, true, 2),
  ('website-redesign', 'Website Redesign Project', 'Marketing / Digital',
   'Manage the end-to-end redesign of a company website with a tight deadline.',
   7, 'Beginner', 10, ARRAY['Scope Mgmt','Deadline Mgmt','Comms Plan'], 'monitor', false, false, 3),
  ('office-relocation', 'Office Relocation Project', 'Operations',
   'Plan and deliver a smooth relocation to a new office with minimal disruption.',
   14, 'Intermediate', 18, ARRAY['Planning','Risk Mgmt','Communications'], 'building', false, false, 4),
  ('new-product-launch', 'New Product Launch Project', 'Product',
   'Coordinate a cross-functional team to launch a new product to market.',
   21, 'Advanced', 20, ARRAY['Cross-functional','Escalations','Reporting'], 'rocket', false, false, 5),
  ('ev-charging-network', 'EV Charging Network Rollout', 'Infrastructure',
   'Manage the rollout of EV charging stations across multiple regions.',
   14, 'Intermediate', 16, ARRAY['Risk Mgmt','Stakeholder Mgmt','Budgeting'], 'zap', false, false, 6);

CREATE TABLE public.project_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.project_templates(id) ON DELETE RESTRICT,
  display_name text,
  current_phase text NOT NULL DEFAULT 'Initiation',
  progress_pct integer NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','archived')),
  started_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  seeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX project_instances_user_idx ON public.project_instances(user_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_instances TO authenticated;
GRANT ALL ON public.project_instances TO service_role;

ALTER TABLE public.project_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own project instances"
  ON public.project_instances FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER project_instances_updated_at
  BEFORE UPDATE ON public.project_instances
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.tasks ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.inbox_messages ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.comms_messages ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.raid_items ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.meetings ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.status_reports ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.change_requests ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.phase_gates ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.budget_lines ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.workstream_rag ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.stakeholder_relationships ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.simulation_state ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.user_competencies ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.reflection_entries ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;
ALTER TABLE public.ai_feedback ADD COLUMN project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE CASCADE;

-- Backfill: one Digital Care Records instance per existing user
DO $$
DECLARE
  dcr_template uuid;
BEGIN
  SELECT id INTO dcr_template FROM public.project_templates WHERE slug = 'digital-care-records';

  INSERT INTO public.project_instances (user_id, template_id, display_name, seeded)
  SELECT u.uid, dcr_template, 'Digital Care Records Rollout', true
  FROM (
    SELECT DISTINCT user_id AS uid FROM public.tasks WHERE user_id IS NOT NULL
    UNION SELECT DISTINCT user_id FROM public.inbox_messages WHERE user_id IS NOT NULL
    UNION SELECT DISTINCT user_id FROM public.simulation_state WHERE user_id IS NOT NULL
    UNION SELECT DISTINCT id FROM public.profiles WHERE id IS NOT NULL
  ) u
  ON CONFLICT DO NOTHING;

  UPDATE public.tasks t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.inbox_messages t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.comms_messages t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.raid_items t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.meetings t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.status_reports t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.change_requests t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.phase_gates t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.budget_lines t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.workstream_rag t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.stakeholder_relationships t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.documents t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.simulation_state t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.user_competencies t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.reflection_entries t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
  UPDATE public.ai_feedback t SET project_instance_id = pi.id
    FROM public.project_instances pi WHERE pi.user_id = t.user_id AND t.project_instance_id IS NULL;
END $$;

CREATE INDEX tasks_pi_idx ON public.tasks(project_instance_id);
CREATE INDEX inbox_messages_pi_idx ON public.inbox_messages(project_instance_id);
CREATE INDEX comms_messages_pi_idx ON public.comms_messages(project_instance_id);
CREATE INDEX raid_items_pi_idx ON public.raid_items(project_instance_id);
CREATE INDEX meetings_pi_idx ON public.meetings(project_instance_id);
CREATE INDEX status_reports_pi_idx ON public.status_reports(project_instance_id);
CREATE INDEX change_requests_pi_idx ON public.change_requests(project_instance_id);
CREATE INDEX phase_gates_pi_idx ON public.phase_gates(project_instance_id);
CREATE INDEX budget_lines_pi_idx ON public.budget_lines(project_instance_id);
CREATE INDEX workstream_rag_pi_idx ON public.workstream_rag(project_instance_id);
CREATE INDEX stakeholder_relationships_pi_idx ON public.stakeholder_relationships(project_instance_id);
CREATE INDEX documents_pi_idx ON public.documents(project_instance_id);
CREATE INDEX simulation_state_pi_idx ON public.simulation_state(project_instance_id);
CREATE INDEX user_competencies_pi_idx ON public.user_competencies(project_instance_id);
CREATE INDEX reflection_entries_pi_idx ON public.reflection_entries(project_instance_id);
CREATE INDEX ai_feedback_pi_idx ON public.ai_feedback(project_instance_id);
