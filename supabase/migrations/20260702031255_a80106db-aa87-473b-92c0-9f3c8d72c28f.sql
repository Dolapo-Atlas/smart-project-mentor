CREATE TABLE public.marketing_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('content','distribution','ads','campaign')),
  title TEXT NOT NULL,
  brief TEXT NOT NULL,
  channel TEXT,
  audience TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_assets TO authenticated;
GRANT ALL ON public.marketing_assets TO service_role;
ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own marketing assets" ON public.marketing_assets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX marketing_assets_user_created_idx ON public.marketing_assets(user_id, created_at DESC);