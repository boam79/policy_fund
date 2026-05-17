/**
 * POST /api/admin/sync  — 수동 트리거 (Bearer 인증)
 * GET  /api/admin/sync  — Vercel Cron 트리거 (Pro 플랜 전환 시 자동 실행)
 *
 * [Vercel Pro 전환 방법]
 * 1. vercel.json 의 "crons" 주석 해제
 * 2. 로컬 launchd 비활성화: launchctl unload ~/Library/LaunchAgents/com.policyfund.sync.plist
 */

import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

function createSyncClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY_REQUIRED')
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
import {
  fetchAllBizinfoPages,
  fetchAllKStartupPages,
  fetchAllSmes24Pages,
} from '@/lib/gov-support/clients/paginatedFetch'
import type { BizinfoItem } from '@/lib/gov-support/clients/bizinfo'
import {
  normalizeBizinfoItem,
  normalizeKStartupItem,
  normalizeSmes24Item,
} from '@/lib/gov-support/core/normalizer'
import { deduplicate } from '@/lib/gov-support/core/dedup'
import { inferIndustryTags } from '@/lib/industry/inferIndustryTags'

export const dynamic = 'force-dynamic'
/** 전 페이지 수집 시 길어질 수 있어 상한 증대 (플랜에 따라 무시될 수 있음) */
export const maxDuration = 300

/** ms 대기 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const ADMIN_ONLY_EMAIL = (process.env.ADMIN_ONLY_EMAIL ?? 'pjm7908@hanmail.net').toLowerCase().trim()

/** 인증 확인 공통 함수 (cron secret 또는 관리자 세션) */
async function checkAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true

  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const email = user?.email?.toLowerCase().trim()
    return email === ADMIN_ONLY_EMAIL
  } catch {
    return false
  }
}

/**
 * GET /api/admin/sync
 * Vercel Pro Cron Job 트리거용 (vercel.json crons 활성화 필요)
 * 활성화 방법: vercel.json의 "crons" 섹션 주석 해제
 */
export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return Response.json({ error: '인증 실패' }, { status: 401 })
  }
  try {
    return await runSync()
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

/** 재시도 포함 fetch 래퍼 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i === retries) throw e
      await sleep(delayMs * (i + 1))
    }
  }
  throw new Error('unreachable')
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return Response.json({ error: '인증 실패' }, { status: 401 })
  }
  try {
    return await runSync()
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

async function runSync() {
  const startedAt = new Date().toISOString()
  const supabase = createSyncClient()

  let bizinfoCount = 0
  let kstartupCount = 0
  let smes24Count = 0
  let upsertedCount = 0
  const errors: string[] = []

  // 기업마당·K-Startup·중소벤처24: 동일 패턴 페이지네이션 (공통 모듈)
  let bizinfoRawItems: BizinfoItem[] = []
  try {
    bizinfoRawItems = await withRetry(() => fetchAllBizinfoPages())
  } catch (e: unknown) {
    errors.push(`bizinfo: ${e instanceof Error ? e.message : '오류'}`)
  }

  const [kstartupResult, smes24Result] = await Promise.allSettled([
    withRetry(() => fetchAllKStartupPages('Y')),
    withRetry(() => fetchAllSmes24Pages()),
  ])

  const bizinfoItems = bizinfoRawItems.map(normalizeBizinfoItem)
  bizinfoCount = bizinfoItems.length

  // K-Startup 결과 처리
  const kstartupItems =
    kstartupResult.status === 'fulfilled'
      ? kstartupResult.value.map(normalizeKStartupItem)
      : (errors.push(`kstartup: ${kstartupResult.reason?.message ?? '알 수 없는 오류'}`), [])

  kstartupCount = kstartupItems.length

  // 중소벤처24 결과 처리
  const smes24Items =
    smes24Result.status === 'fulfilled'
      ? smes24Result.value.map(normalizeSmes24Item)
      : (errors.push(`smes24: ${smes24Result.reason?.message ?? '알 수 없는 오류'}`), [])

  smes24Count = smes24Items.length

  // 중복 제거
  const allItems = deduplicate([...bizinfoItems, ...kstartupItems, ...smes24Items])

  // Supabase upsert (배치 50건)
  const BATCH = 50
  for (let i = 0; i < allItems.length; i += BATCH) {
    const batch = allItems.slice(i, i + BATCH)
    const rows = batch.map((p) => {
      const industry_tags = inferIndustryTags({
        title: p.title,
        industry: p.industry,
        eligibility_text: p.eligibility_text,
        support_type: p.support_type,
      })
      return {
      source: p.source,
      external_id: p.external_id,
      title: p.title,
      organization: p.organization,
      region: p.region,
      industry: p.industry,
      industry_tags: industry_tags.length > 0 ? industry_tags : null,
      support_type: p.support_type,
      support_amount_min_krw: p.support_amount_min_krw,
      support_amount_max_krw: p.support_amount_max_krw,
      application_start_date: p.application_start_date,
      application_end_date: p.application_end_date,
      eligibility_text: p.eligibility_text,
      exclusion_text: p.exclusion_text,
      required_docs: p.required_docs,
      application_url: p.application_url,
      raw_content: JSON.stringify(p.raw_content),
      status: p.status,
      visibility_status: p.status === 'closed' ? 'hidden' : 'visible',
      synced_at: new Date().toISOString(),
    }
    })

    const { error } = await supabase
      .from('support_programs')
      .upsert(rows, { onConflict: 'source,external_id' })

    if (error) {
      errors.push(`upsert 배치 ${i}-${i + BATCH}: ${error.message}`)
    } else {
      upsertedCount += batch.length
    }
  }

  // api_sync_logs 기록
  // requested_count: 이번 실행에서 합쳐진 원천 건수(중복 제거 전). smes24 누락 시 UI에서 "수집"이 과소 표시됨.
  const fetchedBeforeDedup = bizinfoCount + kstartupCount + smes24Count
  await supabase.from('api_sync_logs').insert({
    source: 'bizinfo_kstartup',
    status: errors.length === 0 ? 'success' : 'partial',
    requested_count: fetchedBeforeDedup,
    inserted_count: upsertedCount,
    updated_count: 0,
    failed_count: errors.length,
    error_message: errors.length > 0 ? errors.join('; ') : null,
    started_at: startedAt,
    ended_at: new Date().toISOString(),
  })

  return Response.json({
    ok: true,
    bizinfoCount,
    kstartupCount,
    smes24Count,
    totalFetched: bizinfoCount + kstartupCount + smes24Count,
    deduplicatedCount: allItems.length,
    upsertedCount,
    errors: errors.length > 0 ? errors : undefined,
  })
}
