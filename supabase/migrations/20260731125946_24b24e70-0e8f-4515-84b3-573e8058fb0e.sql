CREATE TABLE public.certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE SET NULL,
  outcome_id uuid REFERENCES public.project_outcomes(id) ON DELETE SET NULL,
  recipient_name text NOT NULL,
  simulated_role text NOT NULL,
  programme_name text NOT NULL,
  project_name text NOT NULL,
  simulated_budget text,
  simulated_timeline text,
  completion_date timestamp with time zone NOT NULL DEFAULT now(),
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  overall_score integer NOT NULL DEFAULT 0,
  grade text NOT NULL DEFAULT 'Pass',
  performance_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  competencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  development_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_code text NOT NULL UNIQUE,
  certificate_status text NOT NULL DEFAULT 'valid',
  signature_version text NOT NULL DEFAULT 'v1',
  template_version text NOT NULL DEFAULT 'v1',
  superseded_by uuid REFERENCES public.certificates(id) ON DELETE SET NULL,
  revoked_at timestamp with time zone,
  revocation_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX certificates_one_valid_per_run
  ON public.certificates (user_id, project_instance_id)
  WHERE certificate_status = 'valid';

CREATE INDEX certificates_user_idx ON public.certificates (user_id);

GRANT SELECT, INSERT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their certificates"
  ON public.certificates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can create their certificates"
  ON public.certificates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);