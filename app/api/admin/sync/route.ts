/**
 * POST /api/admin/sync?source=bizinfo|kstartup|smes24|all  — 수동 트리거
 * POST body: { source?, verify?: true } — 동기화 후 검증
 * GET  /api/admin/sync?verify=1  — Cron (Pro 전환 시)
 *
 * 실질적 전부 수집: 로컬 `npm run sync` 권장 (Vercel Hobby는 출처당 페이지 상한).
 */

import type { NextRequest } from 'next/server'
import { isAdminSyncAuthorized } from '@/lib/gov-support/sync/adminSyncAuth'
import {
  createProgramSyncClient,
  runProgramSync,
} from '@/lib/gov-support/sync/runProgramSync'
import { runSyncVerify } from '@/lib/gov-support/sync/syncVerify'
import { parseSyncSource, type SyncSource } from '@/lib/gov-support/sync/syncPolicy'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function resolveSource(request: NextRequest, bodySource?: string): SyncSource {
  return parseSyncSource(bodySource ?? request.nextUrl.searchParams.get('source'))
}

async function handleSync(source: SyncSource, options?: { runVerify?: boolean }) {
  const supabase = createProgramSyncClient()
  const result = await runProgramSync(supabase, { source })

  let verify = result.verify
  if (options?.runVerify && !verify) {
    verify = await runSyncVerify(supabase, { source })
  }

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

  if (verify) {
    const gapTotal = verify.sources.reduce((n, s) => n + s.missing_open.length, 0)
    if (verify.overall_health === 'incomplete_sync') {
      parts.push('검증: 불완전 동기화')
    } else if (gapTotal > 0) {
      parts.push(`검증: 미저장(모집중) ${gapTotal}건+`)
    } else {
      parts.push('검증: ok')
    }
  }

  return Response.json({
    message: parts.join(' · '),
    ...result,
    verify,
  })
}

export async function GET(request: NextRequest) {
  if (!(await isAdminSyncAuthorized(request))) {
    return Response.json({ error: '인증 실패' }, { status: 401 })
  }
  try {
    const source = resolveSource(request)
    const runVerify = request.nextUrl.searchParams.get('verify') === '1'
    return await handleSync(source, { runVerify })
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
  if (!(await isAdminSyncAuthorized(request))) {
    return Response.json({ error: '인증 실패' }, { status: 401 })
  }

  let bodySource: string | undefined
  let runVerify = request.nextUrl.searchParams.get('verify') === '1'
  try {
    const body = (await request.json()) as { source?: string; verify?: boolean }
    bodySource = body.source
    if (body.verify === true) runVerify = true
  } catch {
    bodySource = undefined
  }

  try {
    const source = resolveSource(request, bodySource)
    return await handleSync(source, { runVerify })
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
