
-- Helper: active project instance id for a user
CREATE OR REPLACE FUNCTION public.active_project_instance_id(uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_project_instance_id FROM public.profiles WHERE id = uid
$$;

-- Trigger to default project_instance_id on inserts
CREATE OR REPLACE FUNCTION public.fill_project_instance_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.project_instance_id IS NULL THEN
    NEW.project_instance_id := public.active_project_instance_id(NEW.user_id);
  END IF;
  RETURN NEW;
END
$$;

-- Update handle_new_user to NOT seed simulation_state (now per-instance, seeded by startProject)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := NEW.id;
  display text := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (uid, display);
  RETURN NEW;
END;
$$;

-- Apply per-instance scoping to all 16 per-user tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'tasks','inbox_messages','comms_messages','raid_items','meetings',
    'status_reports','change_requests','phase_gates','budget_lines',
    'workstream_rag','stakeholder_relationships','documents',
    'simulation_state','user_competencies','reflection_entries','ai_feedback'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop all existing policies
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- Create single ALL policy scoped to user + active project instance
    EXECUTE format($f$
      CREATE POLICY "own scoped %1$s" ON public.%1$I
        FOR ALL TO authenticated
        USING (user_id = auth.uid() AND project_instance_id = public.active_project_instance_id(auth.uid()))
        WITH CHECK (user_id = auth.uid() AND project_instance_id = public.active_project_instance_id(auth.uid()))
    $f$, t);

    -- Attach insert trigger to autofill project_instance_id
    EXECUTE format('DROP TRIGGER IF EXISTS fill_pid_%1$I ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER fill_pid_%1$I BEFORE INSERT ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.fill_project_instance_id()', t);
  END LOOP;
END $$;
