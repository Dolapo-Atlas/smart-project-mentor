ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS unlocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS free_preview_completed_at timestamptz;

UPDATE public.profiles SET access_tier = 'full', unlocked_at = COALESCE(unlocked_at, now()) WHERE access_tier <> 'full';

CREATE TABLE IF NOT EXISTS public.programme_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_ref text NOT NULL UNIQUE,
  amount integer NOT NULL,
  currency text NOT NULL,
  country text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.programme_purchases TO authenticated;
GRANT ALL ON public.programme_purchases TO service_role;

ALTER TABLE public.programme_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners view their own purchases"
ON public.programme_purchases FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER programme_purchases_touch
BEFORE UPDATE ON public.programme_purchases
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();