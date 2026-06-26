ALTER TYPE public.workstream_area ADD VALUE IF NOT EXISTS 'benefits';
ALTER TYPE public.workstream_area ADD VALUE IF NOT EXISTS 'overall';

ALTER TABLE public.workstream_rag
  ADD COLUMN IF NOT EXISTS trend text NOT NULL DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.raid_items
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS date_raised date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS comments text;