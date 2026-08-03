-- 1. Track how access was granted
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_source text NOT NULL DEFAULT 'none';

UPDATE public.profiles
   SET access_source = 'grandfathered'
 WHERE access_tier = 'full' AND access_source = 'none';

-- 2. Refund / dispute tracking on purchases
ALTER TABLE public.programme_purchases
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS amount_refunded integer NOT NULL DEFAULT 0;

-- 3. CRITICAL: learners must not be able to grant themselves access.
--    RLS cannot restrict columns, so use column-level UPDATE privileges.
REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  avatar_url,
  career_goal,
  company,
  country,
  current_project_instance_id,
  display_name,
  first_name,
  last_active_at,
  last_login_at,
  last_name,
  manager,
  onboarded,
  preferred_name,
  project_name,
  role,
  start_date,
  campaign,
  email
) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;