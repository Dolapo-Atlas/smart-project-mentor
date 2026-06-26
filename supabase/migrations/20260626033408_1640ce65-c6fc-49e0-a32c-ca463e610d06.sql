
ALTER TABLE public.project_instances
  ADD COLUMN IF NOT EXISTS intro_seen_at timestamptz;

ALTER TABLE public.project_templates
  ADD COLUMN IF NOT EXISTS chapters_count integer,
  ADD COLUMN IF NOT EXISTS estimated_hours text,
  ADD COLUMN IF NOT EXISTS sponsor_name text,
  ADD COLUMN IF NOT EXISTS sponsor_role text,
  ADD COLUMN IF NOT EXISTS pm_name text,
  ADD COLUMN IF NOT EXISTS pm_role text,
  ADD COLUMN IF NOT EXISTS welcome_intro text;

-- Defaults so every template renders the intro screen sensibly
UPDATE public.project_templates SET
  chapters_count = COALESCE(chapters_count, 12),
  estimated_hours = COALESCE(estimated_hours, '8–12 Hours'),
  sponsor_name = COALESCE(sponsor_name, 'Priya Anand'),
  sponsor_role = COALESCE(sponsor_role, 'Primary Sponsor'),
  pm_name = COALESCE(pm_name, 'Emma Collins'),
  pm_role = COALESCE(pm_role, 'Programme Manager');

-- Healthcare-specific copy
UPDATE public.project_templates SET
  welcome_intro = 'Welcome aboard. You''ve joined the programme as the Project Coordinator. Over the coming weeks you''ll coordinate stakeholders, solve problems, complete deliverables, and help the project reach Go Live. You won''t simply read about project management. You''ll experience it.'
WHERE welcome_intro IS NULL;
