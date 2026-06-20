
ALTER TABLE public.simulation_state
  ADD COLUMN IF NOT EXISTS chapter TEXT NOT NULL DEFAULT 'Chapter One: First Day',
  ADD COLUMN IF NOT EXISTS health TEXT NOT NULL DEFAULT 'amber',
  ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT 'Northbridge Health Services',
  ADD COLUMN IF NOT EXISTS performance JSONB NOT NULL DEFAULT '{"documentation":50,"stakeholder":50,"governance":50,"risk":50,"communication":50}'::jsonb;

ALTER TABLE public.simulation_state ALTER COLUMN project_name SET DEFAULT 'Digital Care Records Rollout';
ALTER TABLE public.simulation_state ALTER COLUMN phase SET DEFAULT 'initiation';

ALTER TABLE public.ai_feedback
  ADD COLUMN IF NOT EXISTS category_scores JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := NEW.id;
  display text := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (uid, display);

  INSERT INTO public.simulation_state (user_id) VALUES (uid);

  INSERT INTO public.inbox_messages (user_id, sender_name, sender_role, subject, body, tone)
  VALUES (
    uid,
    'Sarah Williams',
    'Project Manager, Northbridge Health Services',
    'Welcome — and a few things for your first day',
    E'Hi ' || display || E',\n\nWelcome to Northbridge. I won''t sugar-coat it: the Digital Care Records Rollout is roughly three weeks behind schedule and the sponsor is asking pointed questions.\n\nFor your first day, please draft and upload:\n\n  1. A Project Charter\n  2. A Stakeholder Register\n  3. An initial RAID Log\n\nWe have a governance meeting on Friday and I''d like all three on file before then. Shout if anything is unclear — but assume you have authority to make sensible decisions and document them.\n\nThanks,\nSarah\nProject Manager',
    'supportive'
  );

  INSERT INTO public.tasks (user_id, title, description, priority, status) VALUES
    (uid, 'Draft Project Charter',     'Scope, objectives, success criteria, assumptions, constraints, governance. Upload as PDF or DOCX.', 'high',   'todo'),
    (uid, 'Create Stakeholder Register','Identify all internal and external stakeholders for the 12-care-home rollout. Capture interest, influence, and engagement strategy.', 'high',   'todo'),
    (uid, 'Build initial RAID Log',     'Risks, Assumptions, Issues, Dependencies. Be specific — generic entries will be challenged in the governance meeting.', 'medium', 'todo');

  RETURN NEW;
END;
$function$;
