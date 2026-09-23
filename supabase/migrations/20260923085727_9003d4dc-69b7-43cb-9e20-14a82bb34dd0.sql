UPDATE public.project_templates
SET is_playable = true,
    description = 'Relocate a 480-person head office to a new building before the lease expires. A classic waterfall programme: stage gates, formal sign-offs, long lead times and one immovable move weekend.',
    key_skills = ARRAY['Waterfall Planning','Dependency Management','Stage-Gate Governance','Stakeholder Management','Change Control','Logistics Coordination']::text[],
    duration_days = 84
WHERE slug = 'office-relocation';