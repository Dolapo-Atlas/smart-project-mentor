
ALTER TABLE public.early_access_signups
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_code text;

CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  exists_already boolean;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.early_access_signups WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END $$;

CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := public.gen_referral_code();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_referral_code ON public.early_access_signups;
CREATE TRIGGER trg_set_referral_code
BEFORE INSERT ON public.early_access_signups
FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

UPDATE public.early_access_signups SET referral_code = public.gen_referral_code() WHERE referral_code IS NULL;

-- Public RPC to fetch referral stats (count) by code, without exposing PII
CREATE OR REPLACE FUNCTION public.referral_stats(code text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.early_access_signups WHERE referred_by_code = code;
$$;

GRANT EXECUTE ON FUNCTION public.referral_stats(text) TO anon, authenticated;
