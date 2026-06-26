
-- Fix simulation_state PK so each project instance can have its own row
ALTER TABLE public.simulation_state DROP CONSTRAINT simulation_state_pkey;
UPDATE public.simulation_state s
  SET project_instance_id = p.current_project_instance_id
  FROM public.profiles p
  WHERE s.user_id = p.id AND s.project_instance_id IS NULL AND p.current_project_instance_id IS NOT NULL;
DELETE FROM public.simulation_state WHERE project_instance_id IS NULL;
ALTER TABLE public.simulation_state ALTER COLUMN project_instance_id SET NOT NULL;
ALTER TABLE public.simulation_state ADD CONSTRAINT simulation_state_pkey PRIMARY KEY (user_id, project_instance_id);

-- Backfill: ensure every active project instance has a simulation_state row
INSERT INTO public.simulation_state (user_id, project_instance_id, project_name)
SELECT pi.user_id, pi.id, pi.display_name
FROM public.project_instances pi
LEFT JOIN public.simulation_state s
  ON s.user_id = pi.user_id AND s.project_instance_id = pi.id
WHERE s.user_id IS NULL;

-- Backfill: ensure every project instance whose intro was seen has a welcome email
INSERT INTO public.inbox_messages (user_id, project_instance_id, sender_name, sender_role, subject, tone, body)
SELECT pi.user_id, pi.id,
  COALESCE(pt.pm_name, 'Emma Collins'),
  COALESCE(pt.pm_role, 'Programme Manager'),
  'Welcome to ' || pi.display_name,
  'supportive',
  'Hi there,

Welcome to ' || pi.display_name || '. We are delighted you have joined us as our new Project Coordinator.

Over the coming weeks you will help us coordinate stakeholders, maintain project documentation, support meetings, update reports and keep delivery moving.

Your first objectives are waiting for you in the workspace:

  - Read the Project Charter
  - Meet your key stakeholders
  - Review the current project status
  - Submit an initial status update

Welcome to the team.

' || COALESCE(pt.pm_name, 'Emma Collins') || '
' || COALESCE(pt.pm_role, 'Programme Manager')
FROM public.project_instances pi
LEFT JOIN public.project_templates pt ON pt.id = pi.template_id
WHERE pi.intro_seen_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.inbox_messages im
    WHERE im.user_id = pi.user_id
      AND im.project_instance_id = pi.id
      AND im.sender_name = COALESCE(pt.pm_name, 'Emma Collins')
      AND im.subject = 'Welcome to ' || pi.display_name
  );
