
REVOKE EXECUTE ON FUNCTION public.active_project_instance_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.active_project_instance_id(uuid) TO authenticated, service_role;
