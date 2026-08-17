ALTER TABLE public.phase_gates DROP CONSTRAINT IF EXISTS phase_gates_user_id_phase_key;
CREATE UNIQUE INDEX IF NOT EXISTS phase_gates_user_instance_phase_key
  ON public.phase_gates (user_id, project_instance_id, phase);