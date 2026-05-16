import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'

export const dynamic = 'force-dynamic'

const SERVICE_ROLE_MSG =
  '동기화 로그 API는 SUPABASE_SERVICE_ROLE_KEY가 서버에 설정되어 있어야 합니다.'

function adminDb(): SupabaseClient<Database> | null {
  return createServiceRoleClient()
}

/** GET — 동기화 이력 (관리자 전용, 서버에서 service role로 조회) */
export async function GET() {
  if (!(await isAdminUser())) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const db = adminDb()
  if (!db) {
    return Response.json({ error: SERVICE_ROLE_MSG }, { status: 503 })
  }

  const limit = 30
  const { data, error } = await db
    .from('api_sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, logs: data ?? [] })
}
