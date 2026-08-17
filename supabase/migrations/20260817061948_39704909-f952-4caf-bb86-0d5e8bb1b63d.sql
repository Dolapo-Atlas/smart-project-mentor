CREATE UNIQUE INDEX IF NOT EXISTS budget_lines_unique_line
  ON public.budget_lines (user_id, project_instance_id, category, description, kind)
  WHERE project_instance_id IS NOT NULL AND description IS NOT NULL;