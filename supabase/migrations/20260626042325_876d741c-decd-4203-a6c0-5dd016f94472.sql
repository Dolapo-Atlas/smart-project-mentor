CREATE OR REPLACE FUNCTION public.active_project_instance_id(uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT current_project_instance_id
  FROM public.profiles
  WHERE id = uid
    AND uid = auth.uid()
$function$;

REVOKE EXECUTE ON FUNCTION public.active_project_instance_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.active_project_instance_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_project_instance_id(uuid) TO service_role;