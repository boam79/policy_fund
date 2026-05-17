-- Supabase security advisors (2026-05): anon REST로 공고·문의 무단 쓰기 방지, 함수 hardening

DROP POLICY IF EXISTS server_sync_insert ON public.support_programs;
DROP POLICY IF EXISTS server_sync_update ON public.support_programs;
DROP POLICY IF EXISTS server_sync_log_insert ON public.api_sync_logs;

DROP POLICY IF EXISTS ci_insert_any ON public.customer_inquiries;

DROP POLICY IF EXISTS pi_insert_any ON public.program_impressions;

ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
