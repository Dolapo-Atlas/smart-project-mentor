ALTER TABLE public.simulation_state ALTER COLUMN company SET DEFAULT 'Atlas Enterprise';
UPDATE public.simulation_state SET company = 'Atlas Enterprise' WHERE company ILIKE '%Northbridge%';
UPDATE public.comms_messages SET body = REPLACE(REPLACE(body, 'Northbridge Health Services', 'Atlas Enterprise'), 'Northbridge', 'Atlas Enterprise') WHERE body ILIKE '%Northbridge%';