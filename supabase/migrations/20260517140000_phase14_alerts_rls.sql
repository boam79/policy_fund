-- Phase 14-2: 알림 프로필 확장 + RLS

ALTER TABLE public.alert_profiles
  ADD COLUMN IF NOT EXISTS notify_days_before integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS notify_new_programs boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_digest_at timestamptz;

ALTER TABLE public.alert_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alert_profiles_select_own ON public.alert_profiles;
DROP POLICY IF EXISTS alert_profiles_insert_own ON public.alert_profiles;
DROP POLICY IF EXISTS alert_profiles_update_own ON public.alert_profiles;
DROP POLICY IF EXISTS alert_profiles_delete_own ON public.alert_profiles;

CREATE POLICY alert_profiles_select_own ON public.alert_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY alert_profiles_insert_own ON public.alert_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY alert_profiles_update_own ON public.alert_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY alert_profiles_delete_own ON public.alert_profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
