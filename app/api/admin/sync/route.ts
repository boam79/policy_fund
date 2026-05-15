/**
 * POST /api/admin/sync
 * 기업마당 + K-Startup 공고를 수집해 support_programs DB에 upsert
 * Supabase Service Role Key 필요 (관리자 전용)
 */

import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchBizinfo } from '@/lib/gov-support/clients/bizinfo'
import { fetchKStartup } from '@/lib/gov-support/clients/kstartup'
import { normalizeBizinfoItem, normalizeKStartupItem } from '@/lib/gov-support/core/normalizer'
import { deduplicate } from '@/lib/gov-support/core/dedup'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  // 간단한 관리자 인증 (CRON_SECRET 또는 서비스 롤 키 헤더)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: '인증 실패' }, { status: 401 })
  }

  const startedAt = new Date().toISOString()
  const supabase = createAdminClient()

  let bizinfoCount = 0
  let kstartupCount = 0
  let upsertedCount = 0
  const errors: string[] = []

  // 기업마당 수집 (3개 주요 분야 병렬)
  const bizinfoFields = ['창업', '금융', '기술']
  const bizinfoResults = await Promise.allSettled(
    bizinfoFields.map((field) => fetchBizinfo({ field, pageUnit: 50 }))
  )

  const bizinfoItems = bizinfoResults
    .flatMap((result) => {
      if (result.status === 'fulfilled') return result.value.list
      errors.push(`bizinfo: ${result.reason?.message ?? '알 수 없는 오류'}`)
      return []
    })
    .map(normalizeBizinfoItem)

  bizinfoCount = bizinfoItems.length

  // K-Startup 수집 (모집 중 전체)
  let kstartupItems: ReturnType<typeof normalizeKStartupItem>[] = []
  try {
    const ks = await fetchKStartup({ rcrtPrgsYn: 'Y', numOfRows: 50 })
    kstartupItems = ks.list.map(normalizeKStartupItem)
    kstartupCount = kstartupItems.length
  } catch (e) {
    errors.push(`kstartup: ${e instanceof Error ? e.message : '알 수 없는 오류'}`)
  }

  // 중복 제거
  const allItems = deduplicate([...bizinfoItems, ...kstartupItems])

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
    deduplicatedCount: allItems.length,
    upsertedCount,
    errors: errors.length > 0 ? errors : undefined,
  })
}
