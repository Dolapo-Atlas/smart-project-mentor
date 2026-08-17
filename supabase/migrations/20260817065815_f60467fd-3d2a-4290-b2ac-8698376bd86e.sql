ALTER TABLE public.status_reports ADD COLUMN IF NOT EXISTS sim_week integer;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id, project_instance_id ORDER BY week_start, created_at) AS rn
  FROM public.status_reports
)
UPDATE public.status_reports s SET sim_week = r.rn FROM ranked r WHERE s.id = r.id AND s.sim_week IS NULL;

UPDATE public.status_reports SET sim_week = 1 WHERE sim_week IS NULL;

ALTER TABLE public.status_reports ALTER COLUMN sim_week SET NOT NULL;
ALTER TABLE public.status_reports ALTER COLUMN sim_week SET DEFAULT 1;

ALTER TABLE public.status_reports DROP CONSTRAINT IF EXISTS status_reports_user_id_week_start_key;

CREATE UNIQUE INDEX IF NOT EXISTS status_reports_user_instance_sim_week_key
  ON public.status_reports (user_id, project_instance_id, sim_week);
