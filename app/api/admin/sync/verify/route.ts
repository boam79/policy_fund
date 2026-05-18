import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'
import { isAdminSyncAuthorized } from '@/lib/gov-support/sync/adminSyncAuth'
import { runSyncVerify } from '@/lib/gov-support/sync/syncVerify'
import { parseSyncSource } from '@/lib/gov-support/sync/syncPolicy'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  if (!(await isAdminSyncAuthorized(request))) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 필요' }, { status: 503 })
  }

  const source = parseSyncSource(request.nextUrl.searchParams.get('source'))

  try {
    const result = await runSyncVerify(supabase, { source })
    return Response.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : '검증 실패'
    console.error('[admin/sync/verify]', message)
    return Response.json({ ok: false, message, overall_health: 'api_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
