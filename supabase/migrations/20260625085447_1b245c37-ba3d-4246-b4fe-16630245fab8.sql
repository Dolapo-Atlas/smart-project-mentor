
ALTER TABLE public.profiles
  ADD COLUMN current_project_instance_id uuid REFERENCES public.project_instances(id) ON DELETE SET NULL;

UPDATE public.profiles p
  SET current_project_instance_id = pi.id
  FROM public.project_instances pi
  WHERE pi.user_id = p.id AND p.current_project_instance_id IS NULL;
