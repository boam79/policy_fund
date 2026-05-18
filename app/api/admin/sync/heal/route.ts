import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'
import { isAdminSyncAuthorized } from '@/lib/gov-support/sync/adminSyncAuth'
import { runSyncHeal, healMessage } from '@/lib/gov-support/sync/syncHeal'
import { runSyncVerify } from '@/lib/gov-support/sync/syncVerify'
import { parseSyncSource } from '@/lib/gov-support/sync/syncPolicy'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  if (!(await isAdminSyncAuthorized(request))) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 필요' }, { status: 503 })
  }

  let bodySource: string | undefined
  try {
    const body = (await request.json()) as { source?: string }
    bodySource = body.source
  } catch {
    bodySource = undefined
  }

  const source = parseSyncSource(
    bodySource ?? request.nextUrl.searchParams.get('source') ?? 'all'
  )

  try {
    const heal = await runSyncHeal(supabase, { source })
    const verify = await runSyncVerify(supabase, { source })

    return Response.json({
      ok: heal.ok,
      message: healMessage(heal),
      heal,
      verify,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : '보강 실패'
    console.error('[admin/sync/heal]', message)
    return Response.json({ ok: false, message }, { status: 500 })
  }
}
