import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 서버 전용 Supabase 클라이언트. RLS 우회가 필요한 API에서만 사용.
 * anon 키 폴백은 금지(키 누락 시 쓰기·조회 권한 오류 방지).
 */
export function getServiceRoleClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function requireServiceRoleClient(): SupabaseClient<Database> {
  const client = getServiceRoleClient()
  if (!client) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY_REQUIRED')
  }
  return client
}
