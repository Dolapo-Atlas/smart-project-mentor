CREATE OR REPLACE FUNCTION public.active_project_instance_id(uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT current_project_instance_id
  FROM public.profiles
  WHERE id = uid
    AND uid = auth.uid()
$function$;

GRANT EXECUTE ON FUNCTION public.active_project_instance_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_project_instance_id(uuid) TO service_role;

-- Repair any project instances that were created while scoped inserts were blocked.
UPDATE public.profiles p
SET current_project_instance_id = pi.id
FROM (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM public.project_instances
  WHERE status IN ('active', 'paused')
  ORDER BY user_id, last_active_at DESC, created_at DESC
) pi
WHERE p.id = pi.user_id
  AND (p.current_project_instance_id IS NULL OR p.current_project_instance_id <> pi.id);

INSERT INTO public.simulation_state (user_id, project_instance_id, project_name)
SELECT pi.user_id, pi.id, COALESCE(pi.display_name, pt.title, 'Atlas Simulation')
FROM public.project_instances pi
LEFT JOIN public.project_templates pt ON pt.id = pi.template_id
LEFT JOIN public.simulation_state ss
  ON ss.user_id = pi.user_id AND ss.project_instance_id = pi.id
WHERE ss.user_id IS NULL
ON CONFLICT (user_id, project_instance_id) DO NOTHING;

INSERT INTO public.inbox_messages (
  user_id,
  project_instance_id,
  sender_name,
  sender_role,
  subject,
  tone,
  body
)
SELECT
  pi.user_id,
  pi.id,
  COALESCE(pt.pm_name, 'Emma Collins'),
  COALESCE(pt.pm_role, 'Programme Manager'),
  'Welcome to ' || COALESCE(pi.display_name, pt.title, 'your new project'),
  'supportive',
  'Hi ' || COALESCE(NULLIF(p.preferred_name, ''), p.first_name, split_part(COALESCE(p.display_name, 'there'), ' ', 1), 'there') || ',

Welcome to ' || COALESCE(pi.display_name, pt.title, 'your new project') || '. We''re delighted you''ve joined us as our new Project Coordinator.

Over the coming weeks you''ll coordinate stakeholders, support meetings, maintain project documents, update reports and keep delivery moving.

For your first day, start by reading the project brief, checking your inbox, reviewing the current work, and responding to anything that needs action.

Welcome to the team.

' || COALESCE(pt.pm_name, 'Emma Collins') || '
' || COALESCE(pt.pm_role, 'Programme Manager')
FROM public.project_instances pi
LEFT JOIN public.project_templates pt ON pt.id = pi.template_id
LEFT JOIN public.profiles p ON p.id = pi.user_id
WHERE pi.intro_seen_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.inbox_messages im
    WHERE im.user_id = pi.user_id
      AND im.project_instance_id = pi.id
      AND im.subject ILIKE 'Welcome to %'
  );