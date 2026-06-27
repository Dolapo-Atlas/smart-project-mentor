
CREATE TABLE public.signup_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.signup_allowlist TO service_role;
ALTER TABLE public.signup_allowlist ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: list is admin-only. Access goes through is_email_allowed().

CREATE OR REPLACE FUNCTION public.is_email_allowed(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.signup_allowlist
    WHERE lower(email) = lower(_email)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_email_allowed(text) TO anon, authenticated;

INSERT INTO public.signup_allowlist (email, note)
VALUES ('rasaqdolapo@gmail.com', 'Founder')
ON CONFLICT (email) DO NOTHING;
