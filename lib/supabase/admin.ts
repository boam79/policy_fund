import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * 서버 전용 Supabase Admin 클라이언트
 * SERVICE_ROLE_KEY는 절대 클라이언트에 노출하지 않는다.
 * API Routes / Server Actions / Cron에서만 사용한다.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.')
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
