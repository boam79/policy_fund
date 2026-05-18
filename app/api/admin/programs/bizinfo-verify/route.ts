import { isAdminUser } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'
import { runBizinfoCrossCheck } from '@/lib/gov-support/sync/bizinfoCrossCheck'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET() {
  if (!(await isAdminUser())) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 필요' }, { status: 503 })
  }

  try {
    const result = await runBizinfoCrossCheck(supabase)
    return Response.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : '교차검증 실패'
    console.error('[bizinfo-verify]', message)
    return Response.json({ ok: false, message }, { status: 500 })
  }
}
