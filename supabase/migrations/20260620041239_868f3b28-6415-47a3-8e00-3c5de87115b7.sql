CREATE TABLE public.comms_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  thread_id UUID NOT NULL DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  from_role TEXT NOT NULL,
  to_roles TEXT[] NOT NULL DEFAULT '{}',
  msg_type TEXT NOT NULL CHECK (msg_type IN ('Update','Escalation','Request','FYI')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachment_kind TEXT,
  attachment_ref TEXT,
  attachment_label TEXT,
  sentiment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comms_messages TO authenticated;
GRANT ALL ON public.comms_messages TO service_role;
ALTER TABLE public.comms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own comms" ON public.comms_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_comms_user_thread ON public.comms_messages(user_id, thread_id, created_at);