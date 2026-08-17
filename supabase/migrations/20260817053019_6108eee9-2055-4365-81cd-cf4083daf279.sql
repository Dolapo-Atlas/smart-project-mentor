-- Resync simulation_state.phase to the authoritative gate ledger.
-- The legacy document-review path could advance the phase without a gate decision.
UPDATE public.simulation_state s
SET phase = pi.current_phase,
    updated_at = now()
FROM public.project_instances pi
WHERE pi.id = s.project_instance_id
  AND pi.current_phase IS NOT NULL
  AND lower(pi.current_phase) <> lower(s.phase)
  AND NOT EXISTS (
    SELECT 1 FROM public.phase_gates g
    WHERE g.user_id = s.user_id
      AND g.project_instance_id = s.project_instance_id
      AND lower(g.phase::text) = lower(s.phase)
      AND g.status IN ('open', 'passed')
  );