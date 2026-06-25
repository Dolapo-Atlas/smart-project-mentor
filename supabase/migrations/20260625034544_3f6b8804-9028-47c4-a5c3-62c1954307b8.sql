ALTER TABLE public.early_access_signups
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT;

DROP POLICY IF EXISTS "Anyone can submit early access signup" ON public.early_access_signups;

CREATE POLICY "Anyone can submit early access signup"
  ON public.early_access_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(name) BETWEEN 1 AND 100
    AND char_length(email) BETWEEN 3 AND 255
    AND char_length(desired_role) BETWEEN 1 AND 100
    AND (country IS NULL OR char_length(country) BETWEEN 1 AND 80)
    AND (experience_level IS NULL OR char_length(experience_level) BETWEEN 1 AND 60)
  );