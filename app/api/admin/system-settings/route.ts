import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'

export const dynamic = 'force-dynamic'

const DATA_MODE_KEY = 'data_mode'
const ALLOWED_MODES = ['api_minimal_cache', 'db_centric'] as const

const SERVICE_ROLE_MSG =
  '시스템 설정 API는 SUPABASE_SERVICE_ROLE_KEY가 서버에 설정되어 있어야 합니다.'

function adminDb(): SupabaseClient<Database> | null {
  return createServiceRoleClient()
}

/** GET — data_mode 조회 */
export async function GET() {
  if (!(await isAdminUser())) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const db = adminDb()
  if (!db) {
    return Response.json({ error: SERVICE_ROLE_MSG }, { status: 503 })
  }

  const { data, error } = await db
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', DATA_MODE_KEY)
    .maybeSingle()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const dataMode =
    typeof data?.setting_value === 'string' && ALLOWED_MODES.includes(data.setting_value as (typeof ALLOWED_MODES)[number])
      ? data.setting_value
      : 'api_minimal_cache'

  return Response.json({ ok: true, data_mode: dataMode })
}

/** PUT — data_mode 저장 */
export async function PUT(request: Request) {
  if (!(await isAdminUser())) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const db = adminDb()
  if (!db) {
    return Response.json({ error: SERVICE_ROLE_MSG }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const dataMode = typeof body.data_mode === 'string' ? body.data_mode.trim() : ''

  if (!(ALLOWED_MODES as readonly string[]).includes(dataMode)) {
    return Response.json({ error: '허용되지 않은 data_mode입니다.' }, { status: 400 })
  }

  const { error } = await db
    .from('system_settings')
    .upsert(
      {
        setting_key: DATA_MODE_KEY,
        setting_value: dataMode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'setting_key' }
    )

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, data_mode: dataMode })
}
