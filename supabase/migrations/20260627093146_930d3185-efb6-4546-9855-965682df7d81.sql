
ALTER TABLE public.project_templates
  ADD COLUMN IF NOT EXISTS stakeholders jsonb NOT NULL DEFAULT '[]'::jsonb;

-- CRM Implementation
UPDATE public.project_templates SET
  pm_name = 'Emma Collins', pm_role = 'Programme Manager',
  sponsor_name = 'Marcus Hale', sponsor_role = 'Chief Revenue Officer',
  stakeholders = '[
    {"role":"pm","name":"Emma Collins","title":"Programme Manager","seed":"crm-pm-emma-collins"},
    {"role":"sponsor","name":"Marcus Hale","title":"Chief Revenue Officer","seed":"crm-sponsor-marcus-hale"},
    {"role":"finance","name":"Priya Anand","title":"Finance Lead","seed":"crm-finance-priya-anand"},
    {"role":"tech","name":"Ravi Shah","title":"CRM Solutions Architect","seed":"crm-tech-ravi-shah"},
    {"role":"operations","name":"Hannah Briggs","title":"Sales Operations Lead","seed":"crm-ops-hannah-briggs"},
    {"role":"admin","name":"Liam Doyle","title":"CRM Administrator","seed":"crm-admin-liam-doyle"},
    {"role":"vendor","name":"Helio CRM","title":"Vendor — Implementation Partner","seed":"crm-vendor-helio"}
  ]'::jsonb
WHERE slug = 'crm-implementation';

-- Website Redesign
UPDATE public.project_templates SET
  pm_name = 'Emma Collins', pm_role = 'Programme Manager',
  sponsor_name = 'Lena Park', sponsor_role = 'VP Marketing',
  stakeholders = '[
    {"role":"pm","name":"Emma Collins","title":"Programme Manager","seed":"web-pm-emma-collins"},
    {"role":"sponsor","name":"Lena Park","title":"VP Marketing","seed":"web-sponsor-lena-park"},
    {"role":"finance","name":"Priya Anand","title":"Finance Lead","seed":"web-finance-priya-anand"},
    {"role":"tech","name":"Mei Tanaka","title":"Lead Frontend Engineer","seed":"web-tech-mei-tanaka"},
    {"role":"operations","name":"Olu Adeyemi","title":"UX Research Lead","seed":"web-ux-olu-adeyemi"},
    {"role":"admin","name":"Yuki Sato","title":"Brand Designer","seed":"web-design-yuki-sato"},
    {"role":"vendor","name":"PixelForge Studio","title":"Vendor — Design Agency","seed":"web-vendor-pixelforge"}
  ]'::jsonb
WHERE slug = 'website-redesign';

-- Office Relocation
UPDATE public.project_templates SET
  pm_name = 'Emma Collins', pm_role = 'Programme Manager',
  sponsor_name = 'Daniel Reeve', sponsor_role = 'Chief Operating Officer',
  stakeholders = '[
    {"role":"pm","name":"Emma Collins","title":"Programme Manager","seed":"ofc-pm-emma-collins"},
    {"role":"sponsor","name":"Daniel Reeve","title":"Chief Operating Officer","seed":"ofc-sponsor-daniel-reeve"},
    {"role":"finance","name":"Priya Anand","title":"Finance Lead","seed":"ofc-finance-priya-anand"},
    {"role":"tech","name":"Tom Becker","title":"IT Infrastructure Lead","seed":"ofc-tech-tom-becker"},
    {"role":"operations","name":"Clara Voss","title":"Facilities Manager","seed":"ofc-ops-clara-voss"},
    {"role":"admin","name":"Priscilla Owen","title":"HR Business Partner","seed":"ofc-hr-priscilla-owen"},
    {"role":"vendor","name":"Hartwell Movers","title":"Vendor — Relocation Partner","seed":"ofc-vendor-hartwell"}
  ]'::jsonb
WHERE slug = 'office-relocation';

-- EV Charging Network
UPDATE public.project_templates SET
  pm_name = 'Emma Collins', pm_role = 'Programme Manager',
  sponsor_name = 'Aisha Bello', sponsor_role = 'Director of Infrastructure',
  stakeholders = '[
    {"role":"pm","name":"Emma Collins","title":"Programme Manager","seed":"ev-pm-emma-collins"},
    {"role":"sponsor","name":"Aisha Bello","title":"Director of Infrastructure","seed":"ev-sponsor-aisha-bello"},
    {"role":"finance","name":"Priya Anand","title":"Finance Lead","seed":"ev-finance-priya-anand"},
    {"role":"tech","name":"Henrik Olsen","title":"Charging Systems Engineer","seed":"ev-tech-henrik-olsen"},
    {"role":"operations","name":"Ife Lawal","title":"Site Acquisition Manager","seed":"ev-ops-ife-lawal"},
    {"role":"admin","name":"Marco Conti","title":"Grid Compliance Officer","seed":"ev-grid-marco-conti"},
    {"role":"vendor","name":"VoltaGrid Ltd","title":"Vendor — Hardware Supplier","seed":"ev-vendor-voltagrid"}
  ]'::jsonb
WHERE slug = 'ev-charging-network';

-- New Product Launch
UPDATE public.project_templates SET
  pm_name = 'Emma Collins', pm_role = 'Programme Manager',
  sponsor_name = 'Jordan Pike', sponsor_role = 'Chief Product Officer',
  stakeholders = '[
    {"role":"pm","name":"Emma Collins","title":"Programme Manager","seed":"npl-pm-emma-collins"},
    {"role":"sponsor","name":"Jordan Pike","title":"Chief Product Officer","seed":"npl-sponsor-jordan-pike"},
    {"role":"finance","name":"Priya Anand","title":"Finance Lead","seed":"npl-finance-priya-anand"},
    {"role":"tech","name":"Sofia Marín","title":"Platform Engineering Lead","seed":"npl-tech-sofia-marin"},
    {"role":"operations","name":"Theo Ranjit","title":"Go-to-Market Lead","seed":"npl-gtm-theo-ranjit"},
    {"role":"admin","name":"Nadia Roche","title":"Customer Insights Lead","seed":"npl-insights-nadia-roche"},
    {"role":"vendor","name":"Northbeam Agency","title":"Vendor — Launch Agency","seed":"npl-vendor-northbeam"}
  ]'::jsonb
WHERE slug = 'new-product-launch';

-- Digital Care Records (existing cast preserved)
UPDATE public.project_templates SET
  pm_name = 'Sarah Williams', pm_role = 'Project Manager',
  sponsor_name = 'David Okafor', sponsor_role = 'Executive Sponsor',
  stakeholders = '[
    {"role":"pm","name":"Sarah Williams","title":"Project Manager","seed":"dcr-pm-sarah-williams"},
    {"role":"sponsor","name":"David Okafor","title":"Executive Sponsor","seed":"dcr-sponsor-david-okafor"},
    {"role":"finance","name":"Priya Anand","title":"Finance Lead","seed":"dcr-finance-priya-anand"},
    {"role":"tech","name":"James Lin","title":"Technical Lead","seed":"dcr-tech-james-lin"},
    {"role":"care_home","name":"Margaret Hollis","title":"Care Home Manager, Oakwood","seed":"dcr-ops-margaret-hollis"},
    {"role":"clinical","name":"Rachel Stone","title":"Clinical Governance Lead","seed":"dcr-clin-rachel-stone"},
    {"role":"vendor","name":"CareSoft Ltd","title":"Vendor — Implementation","seed":"dcr-vendor-caresoft"}
  ]'::jsonb
WHERE slug = 'digital-care-records';
