
CREATE TABLE IF NOT EXISTS public.project_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_instance_id uuid NOT NULL REFERENCES public.project_instances(id) ON DELETE CASCADE,
  template_title text NOT NULL,
  user_display_name text,
  user_role text,
  score integer NOT NULL DEFAULT 0,
  grade text NOT NULL DEFAULT 'Pass',
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  share_slug text NOT NULL UNIQUE DEFAULT lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_instance_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_outcomes TO authenticated;
GRANT SELECT ON public.project_outcomes TO anon;
GRANT ALL ON public.project_outcomes TO service_role;

ALTER TABLE public.project_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own outcomes"
ON public.project_outcomes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Public certificate read: anyone with the share_slug can fetch the row,
-- but only safe columns are projected by the server fn.
CREATE POLICY "Public can read outcomes for certificate"
ON public.project_outcomes
FOR SELECT
TO anon
USING (true);

CREATE TRIGGER trg_project_outcomes_touch
BEFORE UPDATE ON public.project_outcomes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
