
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Storage policies: each user can read/write only their own files in project-documents
CREATE POLICY "users read own docs" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users upload own docs" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own docs" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
