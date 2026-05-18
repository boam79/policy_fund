/**
 * POST /api/admin/sync?source=bizinfo|kstartup|smes24|all  — 수동 트리거
 * GET  /api/admin/sync  — Cron (Pro 전환 시)
 *
 * 실질적 전부 수집: 로컬 `npm run sync` 권장 (Vercel Hobby는 출처당 페이지 상한).
 */

import type { NextRequest } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth/admin'
import { isCronBearerAuthorized } from '@/lib/security/cronAuth'
import {
  createProgramSyncClient,
  runProgramSync,
} from '@/lib/gov-support/sync/runProgramSync'
import { parseSyncSource } from '@/lib/gov-support/sync/syncPolicy'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function checkAuth(request: NextRequest): Promise<boolean> {
  if (isCronBearerAuthorized(request)) return true

  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return isAdminEmail(user?.email)
  } catch {
    return false
  }
}

function resolveSource(request: NextRequest): string | undefined {
  const fromQuery = request.nextUrl.searchParams.get('source')
  return fromQuery ?? undefined
}

async function handleSync(request: NextRequest) {
  const source = parseSyncSource(resolveSource(request))
  const supabase = createProgramSyncClient()
  const result = await runProgramSync(supabase, { source })

  const parts = [
    `기업마당 ${result.bizinfoCount}건`,
    `K-Startup ${result.kstartupCount}건`,
    `중소벤처24 ${result.smes24Count}건`,
    `저장 ${result.upsertedCount}건`,
  ]
  if (result.bizinfoReportedTotal) {
    parts.push(`(기업마당 API totCnt ${result.bizinfoReportedTotal})`)
  }
  if (result.truncated) {
    parts.push('일부만 수집됨 — 로컬 npm run sync 권장')
  }
  if (result.skippedClosedCount > 0) {
    parts.push(`마감 ${result.skippedClosedCount}건 저장 생략`)
  }
  if (result.closedMarkedCount > 0) {
    parts.push(`기존 마감 ${result.closedMarkedCount}건 반영`)
  }

  return Response.json({
    message: parts.join(' · '),
    ...result,
  })
}

export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return Response.json({ error: '인증 실패' }, { status: 401 })
  }
  try {
    return await handleSync(request)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'SUPABASE_SERVICE_ROLE_KEY_REQUIRED') {
      return Response.json(
        { error: '동기화에는 서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있어야 합니다.' },
        { status: 503 }
      )
    }
    throw e
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return Response.json({ error: '인증 실패' }, { status: 401 })
  }

  let bodySource: string | undefined
  try {
    const body = (await request.json()) as { source?: string }
    bodySource = body.source
  } catch {
    bodySource = undefined
  }

  const source = parseSyncSource(bodySource ?? resolveSource(request))

  try {
    const supabase = createProgramSyncClient()
    const result = await runProgramSync(supabase, { source })

    const parts = [
      `기업마당 ${result.bizinfoCount}건`,
      `K-Startup ${result.kstartupCount}건`,
      `중소벤처24 ${result.smes24Count}건`,
      `저장 ${result.upsertedCount}건`,
    ]
    if (result.bizinfoReportedTotal) {
      parts.push(`(기업마당 API totCnt ${result.bizinfoReportedTotal})`)
    }
    if (result.truncated) {
      parts.push('일부만 수집됨 — 로컬 npm run sync 권장')
    }
    if (result.skippedClosedCount > 0) {
      parts.push(`마감 ${result.skippedClosedCount}건 저장 생략`)
    }
    if (result.closedMarkedCount > 0) {
      parts.push(`기존 마감 ${result.closedMarkedCount}건 반영`)
    }

    return Response.json({
      message: parts.join(' · '),
      ...result,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'SUPABASE_SERVICE_ROLE_KEY_REQUIRED') {
      return Response.json(
        { error: '동기화에는 서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있어야 합니다.' },
        { status: 503 }
      )
    }
    throw e
  }
}
