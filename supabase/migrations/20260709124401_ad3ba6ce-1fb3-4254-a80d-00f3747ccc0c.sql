
-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS sign_up_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- 2. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'beta_tester');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;
CREATE POLICY "admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Updated new-user trigger: fills profile from provider metadata and assigns beta_tester role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := NEW.id;
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  display text := COALESCE(
    meta->>'display_name',
    meta->>'full_name',
    meta->>'name',
    split_part(NEW.email, '@', 1)
  );
  first_n text := COALESCE(meta->>'given_name', meta->>'first_name', split_part(display, ' ', 1));
  last_n text := COALESCE(meta->>'family_name', meta->>'last_name', NULLIF(split_part(display, ' ', 2), ''));
  avatar text := COALESCE(meta->>'avatar_url', meta->>'picture');
  country_v text := COALESCE(meta->>'country', meta->>'locale');
BEGIN
  INSERT INTO public.profiles (id, display_name, first_name, last_name, email, avatar_url, country, sign_up_at, last_login_at, last_active_at)
  VALUES (uid, display, first_n, last_n, NEW.email, avatar, country_v, now(), now(), now())
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    first_name = COALESCE(public.profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(public.profiles.last_name, EXCLUDED.last_name),
    country = COALESCE(public.profiles.country, EXCLUDED.country);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'beta_tester')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill existing users: emails, avatars, roles
UPDATE public.profiles p
SET email = COALESCE(p.email, u.email),
    avatar_url = COALESCE(p.avatar_url, u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
    country = COALESCE(p.country, u.raw_user_meta_data->>'country', u.raw_user_meta_data->>'locale'),
    sign_up_at = COALESCE(p.sign_up_at, u.created_at),
    last_login_at = COALESCE(p.last_login_at, u.last_sign_in_at)
FROM auth.users u
WHERE u.id = p.id;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'beta_tester'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Seed admins
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role FROM auth.users u
WHERE lower(u.email) IN ('rasaqdolapo@gmail.com','fuhad.dolapo@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
