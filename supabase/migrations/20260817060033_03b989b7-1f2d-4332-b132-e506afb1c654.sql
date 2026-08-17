-- 1. Tag template-sourced documents with their canonical artifact type.
UPDATE public.documents
SET artifact_type = split_part(replace(storage_path, 'template://', ''), '/', 1)
WHERE artifact_type IS NULL
  AND storage_path LIKE 'template://%';

-- 2. Backfill project_artifacts from those documents, preserving order as versions.
WITH src AS (
  SELECT d.id,
         d.user_id,
         d.project_instance_id,
         d.artifact_type,
         d.title,
         d.content_excerpt,
         d.status,
         d.quality_score,
         d.created_at,
         row_number() OVER (
           PARTITION BY d.user_id, d.project_instance_id, d.artifact_type
           ORDER BY d.created_at
         ) AS ver,
         count(*) OVER (
           PARTITION BY d.user_id, d.project_instance_id, d.artifact_type
         ) AS total
  FROM public.documents d
  WHERE d.storage_path LIKE 'template://%'
    AND d.artifact_type IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.project_artifacts a
      WHERE a.source_table = 'documents' AND a.source_id = d.id
    )
),
fb AS (
  SELECT DISTINCT ON (document_id)
         document_id, score, summary, strengths, recommendations
  FROM public.ai_feedback
  WHERE document_id IS NOT NULL
  ORDER BY document_id, created_at DESC
),
ctx AS (
  SELECT pi.id AS instance_id,
         COALESCE(pi.display_name, pt.title) AS project_name
  FROM public.project_instances pi
  LEFT JOIN public.project_templates pt ON pt.id = pi.template_id
)
INSERT INTO public.project_artifacts (
  user_id, project_instance_id, artifact_type, title, version, is_latest,
  status, payload, content_markdown, simulated_role, project_name,
  source_table, source_id, reviewer_name, review_result,
  submitted_at, approved_at, created_at, updated_at
)
SELECT
  s.user_id,
  s.project_instance_id,
  s.artifact_type,
  s.title,
  s.ver,
  (s.ver = s.total),
  CASE
    WHEN s.quality_score IS NULL THEN 'submitted'
    WHEN s.quality_score >= 70 THEN 'approved'
    ELSE 'changes_requested'
  END,
  '{}'::jsonb,
  s.content_excerpt,
  p.role,
  ctx.project_name,
  'documents',
  s.id,
  CASE WHEN s.quality_score IS NOT NULL THEN 'PMO Reviewer' END,
  CASE WHEN fb.document_id IS NOT NULL THEN jsonb_build_object(
    'score', fb.score,
    'decision', CASE WHEN COALESCE(fb.score, 0) >= 70 THEN 'approved' ELSE 'changes_requested' END,
    'comment', fb.summary,
    'strengths', COALESCE(fb.strengths, '[]'::jsonb),
    'required_changes', COALESCE(fb.recommendations, '[]'::jsonb)
  ) END,
  s.created_at,
  CASE WHEN COALESCE(s.quality_score, 0) >= 70 THEN s.created_at END,
  s.created_at,
  s.created_at
FROM src s
LEFT JOIN fb ON fb.document_id = s.id
LEFT JOIN ctx ON ctx.instance_id = s.project_instance_id
LEFT JOIN public.profiles p ON p.id = s.user_id;

-- 3. Ensure exactly one latest version per (user, instance, artifact type).
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, project_instance_id, artifact_type
           ORDER BY version DESC
         ) AS rn
  FROM public.project_artifacts
)
UPDATE public.project_artifacts a
SET is_latest = (r.rn = 1)
FROM ranked r
WHERE r.id = a.id AND a.is_latest <> (r.rn = 1);
