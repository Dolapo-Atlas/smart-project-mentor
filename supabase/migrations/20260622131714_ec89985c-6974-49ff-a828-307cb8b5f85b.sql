CREATE TABLE public.stakeholder_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stakeholder_name text NOT NULL,
  role text NOT NULL DEFAULT '',
  sentiment integer NOT NULL DEFAULT 0,
  concerns text[] NOT NULL DEFAULT '{}',
  notes text NOT NULL DEFAULT '',
  interaction_count integer NOT NULL DEFAULT 0,
  last_interaction timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, stakeholder_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stakeholder_relationships TO authenticated;
GRANT ALL ON public.stakeholder_relationships TO service_role;

ALTER TABLE public.stakeholder_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stakeholder relationships"
ON public.stakeholder_relationships
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER stakeholder_relationships_touch_updated_at
BEFORE UPDATE ON public.stakeholder_relationships
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();