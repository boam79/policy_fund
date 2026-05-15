/**
 * POST /api/admin/sync
 * 기업마당 + K-Startup 공고를 수집해 support_programs DB에 upsert
 * Supabase Service Role Key 필요 (관리자 전용)
 */

import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

function createSyncClient() {
  // service_role 키가 있으면 admin으로, 없으면 anon으로 동작
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
import { fetchBizinfo } from '@/lib/gov-support/clients/bizinfo'
import { fetchKStartup } from '@/lib/gov-support/clients/kstartup'
import { fetchSmes24 } from '@/lib/gov-support/clients/smes24'
import {
  normalizeBizinfoItem,
  normalizeKStartupItem,
  normalizeSmes24Item,
} from '@/lib/gov-support/core/normalizer'
import { deduplicate } from '@/lib/gov-support/core/dedup'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** ms 대기 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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
  // 간단한 관리자 인증 (CRON_SECRET 또는 서비스 롤 키 헤더)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: '인증 실패' }, { status: 401 })
  }

  const startedAt = new Date().toISOString()
  const supabase = createSyncClient()

  let bizinfoCount = 0
  let kstartupCount = 0
  let smes24Count = 0
  let upsertedCount = 0
  const errors: string[] = []

  // 기업마당: 분야별 순차 요청 (병렬 시 IP 차단 위험)
  const bizinfoRawItems = []
  for (const field of ['창업', '금융', '기술', '인력'] as const) {
    try {
      const result = await withRetry(() => fetchBizinfo({ field, pageUnit: 50 }))
      bizinfoRawItems.push(...result.list)
    } catch (e: unknown) {
      errors.push(`bizinfo[${field}]: ${e instanceof Error ? e.message : '오류'}`)
    }
    await sleep(500) // 분야 간 0.5초 간격
  }

  // K-Startup + 중소벤처24 병렬 (bizinfo 완료 후)
  const [kstartupResult, smes24Result] = await Promise.allSettled([
    withRetry(() => fetchKStartup({ rcrtPrgsYn: 'Y', numOfRows: 50 })),
    fetchSmes24(),
  ])

  // 기업마당 결과 처리 (이미 위에서 수집됨)
  const bizinfoItems = bizinfoRawItems.map(normalizeBizinfoItem)
  bizinfoCount = bizinfoItems.length

  // K-Startup 결과 처리
  const kstartupItems =
    kstartupResult.status === 'fulfilled'
      ? kstartupResult.value.list.map(normalizeKStartupItem)
      : (errors.push(`kstartup: ${kstartupResult.reason?.message ?? '알 수 없는 오류'}`), [])

  kstartupCount = kstartupItems.length

  // 중소벤처24 결과 처리
  const smes24Items =
    smes24Result.status === 'fulfilled'
      ? smes24Result.value.list.map(normalizeSmes24Item)
      : (errors.push(`smes24: ${smes24Result.reason?.message ?? '알 수 없는 오류'}`), [])

  smes24Count = smes24Items.length

  // 중복 제거
  const allItems = deduplicate([...bizinfoItems, ...kstartupItems, ...smes24Items])

  // Supabase upsert (배치 50건)
  const BATCH = 50
  for (let i = 0; i < allItems.length; i += BATCH) {
    const batch = allItems.slice(i, i + BATCH)
    const rows = batch.map((p) => ({
      source: p.source,
      external_id: p.external_id,
      title: p.title,
      organization: p.organization,
      region: p.region,
      industry: p.industry,
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
    }))

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
  await supabase.from('api_sync_logs').insert({
    source: 'bizinfo_kstartup',
    status: errors.length === 0 ? 'success' : 'partial',
    requested_count: bizinfoCount + kstartupCount,
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
