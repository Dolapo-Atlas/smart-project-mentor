
-- Recreate public-role policies scoped to authenticated only
DROP POLICY IF EXISTS "Users manage own budget_lines" ON public.budget_lines;
CREATE POLICY "Users manage own budget_lines" ON public.budget_lines
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own change_requests" ON public.change_requests;
CREATE POLICY "Users manage own change_requests" ON public.change_requests
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own comms" ON public.comms_messages;
CREATE POLICY "own comms" ON public.comms_messages
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own meetings" ON public.meetings;
CREATE POLICY "Users manage own meetings" ON public.meetings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own phase_gates" ON public.phase_gates;
CREATE POLICY "Users manage own phase_gates" ON public.phase_gates
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own raid_items" ON public.raid_items;
CREATE POLICY "Users manage own raid_items" ON public.raid_items
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own reflections" ON public.reflection_entries;
CREATE POLICY "own reflections" ON public.reflection_entries
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own status_reports" ON public.status_reports;
CREATE POLICY "Users manage own status_reports" ON public.status_reports
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own competencies" ON public.user_competencies;
CREATE POLICY "own competencies" ON public.user_competencies
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own workstream_rag" ON public.workstream_rag;
CREATE POLICY "Users manage own workstream_rag" ON public.workstream_rag
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage: add missing UPDATE policy on project-documents bucket
CREATE POLICY "users update own docs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'project-documents' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'project-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);
