ALTER TABLE public.change_requests
  ADD COLUMN IF NOT EXISTS linked_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'received';

CREATE INDEX IF NOT EXISTS change_requests_linked_task_idx ON public.change_requests(linked_task_id);