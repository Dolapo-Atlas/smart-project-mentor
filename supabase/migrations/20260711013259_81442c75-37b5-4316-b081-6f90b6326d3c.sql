
-- Seed CRM chapters (mirror DCR structure, CRM-themed) and mark the CRM template playable.

WITH tmpl AS (
  SELECT id FROM public.project_templates WHERE slug = 'crm-implementation'
)
INSERT INTO public.project_chapters
  (template_id, chapter_number, slug, title, phase, summary, objective, completion_hint, unlock_after_chapter)
SELECT tmpl.id, c.chapter_number, c.slug, c.title, c.phase, c.summary, c.objective, c.completion_hint, c.unlock_after
FROM tmpl,
(VALUES
  (1,  'kickoff',           'Day One: Kickoff',            'initiation', 'Marcus wants a live CRM in 90 days. Sales ops are sceptical. Read the room.', 'Read the welcome briefing and respond to the CRO''s opening email.', 'Reply to the sponsor in Inbox', NULL::int),
  (2,  'stakeholder-mapping','Stakeholder Mapping',        'initiation', 'Seven names, seven agendas — from Sales Ops to the vendor. Find allies before politics finds you.', 'Log every stakeholder in People with an influence/support score.', 'All stakeholders mapped in People', 1),
  (3,  'charter',            'Draft the Charter',          'initiation', 'Scope, objectives, success metrics. One page Marcus will actually sign.', 'Submit the CRM Project Charter task for mentor review.', 'Charter task submitted', 2),
  (4,  'vendor-kickoff',     'Helio Vendor Kickoff',       'planning',   'Helio CRM joins the programme. Their delivery plan does not match yours.', 'Run the Helio kickoff meeting and capture minutes.', 'Vendor kickoff meeting closed', 3),
  (5,  'data-migration-plan','Data Migration Plan',        'planning',   'Twelve years of legacy contacts, duplicates, and orphan accounts. Plan the cleanse before the cutover.', 'Publish a data migration and cleanse plan Ravi will sign off.', 'Data migration plan approved', 4),
  (6,  'risk-register',      'Risk Register',              'planning',   'Name the risks before they name you. Adoption, data loss, integrations — pick your battles.', 'Log at least 8 risks in RAID with owners and mitigations.', '8+ risks logged in RAID', 5),
  (7,  'budget-lock',        'Budget Lock',                'planning',   'Priya wants the number. Lock it now or defend variances later.', 'Submit budget lines totalling within ±5% of the sponsor target.', 'Budget submitted and approved', 6),
  (8,  'pilot-golive',       'Pilot Go-Live',              'execution',  'Two sales pods. Live pipeline. Three days to prove Helio hangs together.', 'Pass the pilot phase gate.', 'Pilot gate marked passed', 7),
  (9,  'sales-pushback',     'Sales Team Pushback',        'execution',  'Reps are logging deals in spreadsheets again. Hannah is losing patience. Turn adoption around.', 'Resolve the pushback before sales sentiment collapses.', 'Sales sentiment recovered', 8),
  (10, 'status-report',      'Status Report to the Board', 'monitoring', 'The board meets Thursday. They want one page, three numbers, no excuses.', 'Submit a board-ready status report.', 'Status report submitted', 9),
  (11, 'phase-gate',         'Phase Gate Review',          'monitoring', 'Go / no-go for full rollout. Steering will not meet again for two weeks.', 'Pass the execution-to-closure phase gate.', 'Phase gate passed', 10),
  (12, 'closure',            'Closure & Handover',         'closure',    'CRM live across every region. Document the lessons. Earn the certificate.', 'Finalise the project and generate your certificate.', 'Outcome generated at /app/results', 11)
) AS c(chapter_number, slug, title, phase, summary, objective, completion_hint, unlock_after)
ON CONFLICT DO NOTHING;

UPDATE public.project_templates
SET is_playable = true, chapters_count = 12, updated_at = now()
WHERE slug = 'crm-implementation';
