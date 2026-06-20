
CREATE TYPE public.raid_kind AS ENUM ('risk','assumption','issue','dependency');
CREATE TYPE public.raid_severity AS ENUM ('low','medium','high','critical');
CREATE TYPE public.raid_status AS ENUM ('open','mitigating','closed');
CREATE TYPE public.rag_status AS ENUM ('green','amber','red');
CREATE TYPE public.workstream_area AS ENUM ('scope','schedule','budget','quality','resources','stakeholders','risks');

CREATE TABLE public.raid_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.raid_kind NOT NULL,
  title text NOT NULL,
  description text,
  severity public.raid_severity NOT NULL DEFAULT 'medium',
  likelihood public.raid_severity NOT NULL DEFAULT 'medium',
  status public.raid_status NOT NULL DEFAULT 'open',
  owner text,
  due_date date,
  mitigation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raid_items TO authenticated;
GRANT ALL ON public.raid_items TO service_role;
ALTER TABLE public.raid_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own raid_items" ON public.raid_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workstream_rag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area public.workstream_area NOT NULL,
  rag public.rag_status NOT NULL DEFAULT 'green',
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, area)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workstream_rag TO authenticated;
GRANT ALL ON public.workstream_rag TO service_role;
ALTER TABLE public.workstream_rag ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own workstream_rag" ON public.workstream_rag
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER raid_items_touch BEFORE UPDATE ON public.raid_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER workstream_rag_touch BEFORE UPDATE ON public.workstream_rag
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
