
CREATE TABLE IF NOT EXISTS public.stakeholder_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE SET NULL,
  linked_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  completion_pct integer NOT NULL DEFAULT 0,
  approval_status text NOT NULL DEFAULT 'draft',
  sponsor_comment text,
  version integer NOT NULL DEFAULT 1,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stakeholder_registers TO authenticated;
GRANT ALL ON public.stakeholder_registers TO service_role;

ALTER TABLE public.stakeholder_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own stakeholder register"
  ON public.stakeholder_registers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS stakeholder_registers_user_idx ON public.stakeholder_registers(user_id);
CREATE INDEX IF NOT EXISTS stakeholder_registers_task_idx ON public.stakeholder_registers(linked_task_id);

CREATE TRIGGER stakeholder_registers_touch
BEFORE UPDATE ON public.stakeholder_registers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.stakeholder_register_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  register_id uuid NOT NULL REFERENCES public.stakeholder_registers(id) ON DELETE CASCADE,
  version integer NOT NULL,
  payload jsonb NOT NULL,
  completion_pct integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.stakeholder_register_versions TO authenticated;
GRANT ALL ON public.stakeholder_register_versions TO service_role;

ALTER TABLE public.stakeholder_register_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own register versions"
  ON public.stakeholder_register_versions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own register versions"
  ON public.stakeholder_register_versions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS stakeholder_register_versions_register_idx
  ON public.stakeholder_register_versions(register_id, version DESC);
