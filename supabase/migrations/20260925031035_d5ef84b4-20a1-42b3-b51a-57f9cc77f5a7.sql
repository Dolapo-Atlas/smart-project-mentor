insert into public.project_chapters (template_id, chapter_number, slug, title, phase, summary, objective, completion_hint, unlock_after_chapter)
select t.id, v.n, v.slug, v.title, v.phase, v.summary, v.objective, v.hint, v.after
from public.project_templates t,
(values
 (1,'kickoff','Day One: Lease Clock Starts','initiation','Meridian House lease expires in 12 weeks. There is no extension. Read the brief before you promise anything.','Read the welcome email, open the Project Initiation Pack and reply to the sponsor.','Reply to the sponsor in Inbox',null::int),
 (2,'stakeholder-mapping','Who Moves, Who Decides','initiation','480 staff, facilities, IT, HR and the landlord. Map influence before the floor plan fights begin.','Log every relocation stakeholder with influence and support scores.','All stakeholders mapped in People',1),
 (3,'charter','Relocation Charter','initiation','Fixed date, fixed budget, fixed scope. Put it on one page the sponsor will sign.','Submit the Project Charter for sponsor approval.','Charter submitted and approved',2),
 (4,'space-planning','Space Planning Sign-off','planning','Desk ratios, meeting rooms and team adjacencies for Kingsgate Quarter. Every department wants the window.','Agree the space plan and baseline the relocation scope.','Space plan task submitted',3),
 (5,'move-vendor-tender','Move Vendor Tender','planning','Three removal firms, one weekend slot. Compare cost, risk and references before you commit.','Evaluate move vendors and recommend a preferred supplier.','Vendor recommendation submitted',4),
 (6,'it-cutover-plan','IT & Comms Cutover Plan','planning','Network, phones and 480 desks must work on Monday morning. Plan the cutover sequence.','Submit the project schedule and IT cutover plan with dependencies.','Schedule and cutover plan submitted',5),
 (7,'budget-lock','Budget Baseline','planning','£1.65M across fit-out, removals, IT and dilapidations. Lock it before the planning gate.','Baseline the budget and pass the planning gate.','Planning gate passed',6),
 (8,'building-works','Building Works Window','execution','Fit-out contractors are on site. Snags, delays and access issues start arriving.','Track fit-out progress and manage issues in the RAID log.','RAID updated and issues actioned',7),
 (9,'staff-pushback','Staff Concerns','execution','Commute changes, desk allocation and parking. Staff anxiety is now a delivery risk.','Respond to staff concerns and issue a relocation communication.','Stakeholder communication sent',8),
 (10,'move-rehearsal','Move Weekend Rehearsal','monitoring','A dry run exposes the gaps. Report status honestly to the steering committee.','Submit the status report and brief the steering committee.','Status report submitted',9),
 (11,'day-one-readiness','Day-One Operational Readiness','monitoring','Go/no-go for the move weekend. Evidence, not optimism.','Pass the go-live readiness gate for the move.','Go-live gate passed',10),
 (12,'lease-handback','Lease Handback & Closure','closure','Meridian House handed back, dilapidations settled, lessons captured before the team disperses.','Submit lessons learned and close the project.','Closure approved',11)
) as v(n,slug,title,phase,summary,objective,hint,after)
where t.slug='office-relocation'
on conflict do nothing;