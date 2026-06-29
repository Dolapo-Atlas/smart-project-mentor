
-- 1. Chapters table: ordered narrative beats per template
CREATE TABLE public.project_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  chapter_number int NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  phase text NOT NULL,
  summary text NOT NULL,
  objective text NOT NULL,
  completion_hint text,
  unlock_after_chapter int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, chapter_number),
  UNIQUE (template_id, slug)
);

GRANT SELECT ON public.project_chapters TO authenticated, anon;
GRANT ALL ON public.project_chapters TO service_role;

ALTER TABLE public.project_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chapters are readable by everyone"
ON public.project_chapters FOR SELECT
TO authenticated, anon
USING (true);

CREATE TRIGGER project_chapters_touch
BEFORE UPDATE ON public.project_chapters
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Per-user progress through chapters of a project instance
CREATE TABLE public.chapter_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_instance_id uuid NOT NULL REFERENCES public.project_instances(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.project_chapters(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'locked', -- locked | active | complete
  started_at timestamptz,
  completed_at timestamptz,
  score int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_instance_id, chapter_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_progress TO authenticated;
GRANT ALL ON public.chapter_progress TO service_role;

ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own chapter progress"
ON public.chapter_progress FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER chapter_progress_touch
BEFORE UPDATE ON public.chapter_progress
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX chapter_progress_user_project_idx
ON public.chapter_progress (user_id, project_instance_id);

-- 3. Seed the 12 DCR chapters
INSERT INTO public.project_chapters
  (template_id, chapter_number, slug, title, phase, summary, objective, completion_hint, unlock_after_chapter)
VALUES
  ('d0d6a503-a44e-415d-9c18-f5d2d3c85ab6', 1, 'kickoff', 'Day One: Kickoff',
   'initiation',
   'You arrive at the trust. The sponsor wants a 90-day rollout. Read the room before you commit.',
   'Read the welcome briefing and respond to the sponsor''s opening email.',
   'Reply to the sponsor in Inbox', NULL),
  ('d0d6a503-a44e-415d-9c18-f5d2d3c85ab6', 2, 'stakeholder-mapping', 'Stakeholder Mapping',
   'initiation',
   'Twelve names, twelve agendas. Find your allies and your blockers before politics finds you.',
   'Log every stakeholder in People with an influence/support score.',
   'All stakeholders mapped in People', 1),
  ('d0d6a503-a44e-415d-9c18-f5d2d3c85ab6', 3, 'charter', 'Draft the Charter',
   'initiation',
   'Scope, objectives, success criteria. One page the sponsor will actually sign.',
   'Submit the Project Charter task for mentor review.',
   'Charter task submitted', 2),
  ('d0d6a503-a44e-415d-9c18-f5d2d3c85ab6', 4, 'vendor-kickoff', 'Vendor Kickoff',
   'planning',
   'The implementation partner joins. Their timeline does not match yours.',
   'Run the vendor kickoff meeting and capture minutes.',
   'Vendor kickoff meeting closed', 3),
  ('d0d6a503-a44e-415d-9c18-f5d2d3c85ab6', 5, 'clinical-signoff', 'Clinical Sign-off',
   'planning',
   'The Chief Clinical Officer has concerns. Win her or lose the rollout.',
   'Resolve the CCO''s objections and secure clinical sign-off.',
   'CCO sentiment ≥ supportive', 4),
  ('d0d6a503-a44e-415d-9c18-f5d2d3c85ab6', 6, 'risk-register', 'Risk Register',
   'planning',
   'Name the risks before they name you. Eight is the minimum; twelve is honest.',
   'Log at least 8 risks in RAID with owners and mitigations.',
   '8+ risks logged in RAID', 5),
  ('d0d6a503-a44e-415d-9c18-f5d2d3c85ab6', 7, 'budget-lock', 'Budget Lock',
   'planning',
   'Finance wants the number. Lock it now or defend variances later.',
   'Submit budget lines totalling within ±5% of sponsor target.',
   'Budget submitted and approved', 6),
  ('d0d6a503-a44e-415d-9c18-f5d2d3c85ab6', 8, 'pilot-golive', 'Pilot Go-Live',
   'execution',
   'Two wards. Live data. Three days to prove it works.',
   'Pass the pilot phase gate.',
   'Pilot gate marked passed', 7),
  ('d0d6a503-a44e-415d-9c18-f5d2d3c85ab6', 9, 'frontline-pushback', 'Frontline Pushback',
   'execution',
   'Nurses are walking out of training. The story is leaking to local press.',
   'Resolve the pushback before sentiment collapses.',
   'Frontline sentiment recovered', 8),
  ('d0d6a503-a44e-415d-9c18-f5d2d3c85ab6', 10, 'status-report', 'Status Report to Board',
   'monitoring',
   'The board meets Thursday. They want one page, three numbers, no excuses.',
   'Submit a board-ready status report.',
   'Status report submitted', 9),
  ('d0d6a503-a44e-415d-9c18-f5d2d3c85ab6', 11, 'phase-gate', 'Phase Gate Review',
   'monitoring',
   'Go / no-go. The steering committee will not meet again for two weeks.',
   'Pass the execution-to-closure phase gate.',
   'Phase gate passed', 10),
  ('d0d6a503-a44e-415d-9c18-f5d2d3c85ab6', 12, 'closure', 'Closure & Handover',
   'closure',
   'Trust-wide rollout signed off. Document the lessons. Earn the certificate.',
   'Finalise the project and generate your certificate.',
   'Outcome generated at /app/results', 11);
