import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

const DATA_MODE_KEY = 'data_mode'
const ALLOWED_MODES = ['api_minimal_cache', 'db_centric'] as const

function adminDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** GET — data_mode 조회 */
export async function GET() {
  if (!(await isAdminUser())) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const { data, error } = await adminDb()
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

  const body = await request.json().catch(() => ({}))
  const dataMode = typeof body.data_mode === 'string' ? body.data_mode.trim() : ''

  if (!(ALLOWED_MODES as readonly string[]).includes(dataMode)) {
    return Response.json({ error: '허용되지 않은 data_mode입니다.' }, { status: 400 })
  }

  const { error } = await adminDb()
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
