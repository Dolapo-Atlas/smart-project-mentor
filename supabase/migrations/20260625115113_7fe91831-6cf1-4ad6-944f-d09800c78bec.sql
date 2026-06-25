
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'tasks','inbox_messages','comms_messages','raid_items','meetings',
    'status_reports','change_requests','phase_gates','budget_lines',
    'workstream_rag','stakeholder_relationships','documents',
    'simulation_state','user_competencies','reflection_entries','ai_feedback'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'own scoped ' || t, t);
    EXECUTE format($f$
      CREATE POLICY "own scoped %1$s" ON public.%1$I
        FOR ALL TO authenticated
        USING (
          user_id = auth.uid()
          AND project_instance_id = public.active_project_instance_id(auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.project_instances pi
            WHERE pi.id = project_instance_id AND pi.user_id = auth.uid()
          )
        )
        WITH CHECK (
          user_id = auth.uid()
          AND project_instance_id = public.active_project_instance_id(auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.project_instances pi
            WHERE pi.id = project_instance_id AND pi.user_id = auth.uid()
          )
        )
    $f$, t);
  END LOOP;
END $$;
