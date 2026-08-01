CREATE TABLE public.learner_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  project_instance_id UUID REFERENCES public.project_instances(id) ON DELETE SET NULL,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  campaign JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.learner_events TO authenticated;
GRANT ALL ON public.learner_events TO service_role;

ALTER TABLE public.learner_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can record their own events"
  ON public.learner_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Learners can view their own events"
  ON public.learner_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
  ON public.learner_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX learner_events_user_created_idx ON public.learner_events (user_id, created_at);
CREATE INDEX learner_events_event_idx ON public.learner_events (event);
CREATE INDEX learner_events_created_idx ON public.learner_events (created_at DESC);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS campaign JSONB NOT NULL DEFAULT '{}'::jsonb;