CREATE TABLE public.landing_settings (
  id integer PRIMARY KEY DEFAULT 1,
  price_ngn integer NOT NULL DEFAULT 10000,
  price_inr integer NOT NULL DEFAULT 799,
  price_usd integer NOT NULL DEFAULT 25,
  founding_places integer NOT NULL DEFAULT 50,
  hero_variant text NOT NULL DEFAULT 'interview',
  video_url text,
  enrolment_open boolean NOT NULL DEFAULT true,
  checkout_note text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT landing_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.landing_settings TO anon;
GRANT SELECT, UPDATE ON public.landing_settings TO authenticated;
GRANT ALL ON public.landing_settings TO service_role;
ALTER TABLE public.landing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read landing settings" ON public.landing_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can update landing settings" ON public.landing_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.landing_settings (id) VALUES (1);

CREATE TABLE public.enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text,
  country text NOT NULL,
  currency text NOT NULL,
  amount integer NOT NULL,
  provider text NOT NULL,
  provider_ref text,
  status text NOT NULL DEFAULT 'pending',
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX enrolments_provider_ref_idx ON public.enrolments (provider_ref) WHERE provider_ref IS NOT NULL;
CREATE INDEX enrolments_email_idx ON public.enrolments (lower(email));

GRANT SELECT ON public.enrolments TO authenticated;
GRANT ALL ON public.enrolments TO service_role;
ALTER TABLE public.enrolments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrolments" ON public.enrolments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER enrolments_touch BEFORE UPDATE ON public.enrolments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER landing_settings_touch BEFORE UPDATE ON public.landing_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();