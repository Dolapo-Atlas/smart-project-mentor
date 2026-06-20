
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS career_goal text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'Project Coordinator',
  ADD COLUMN IF NOT EXISTS company text NOT NULL DEFAULT 'Northbridge Health Services',
  ADD COLUMN IF NOT EXISTS manager text NOT NULL DEFAULT 'Sarah Williams',
  ADD COLUMN IF NOT EXISTS project_name text NOT NULL DEFAULT 'Digital Care Records Rollout',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := NEW.id;
  display text := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (uid, display);
  INSERT INTO public.simulation_state (user_id) VALUES (uid);
  RETURN NEW;
END;
$function$;
