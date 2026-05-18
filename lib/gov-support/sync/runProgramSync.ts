import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import {
  fetchAllBizinfoPages,
  fetchAllKStartupPages,
  fetchAllSmes24Pages,
} from '@/lib/gov-support/clients/paginatedFetch'
import {
  normalizeBizinfoItem,
  normalizeKStartupItem,
  normalizeSmes24Item,
  type NormalizedProgram,
} from '@/lib/gov-support/core/normalizer'
import { deduplicate } from '@/lib/gov-support/core/dedup'
import { inferIndustryTags } from '@/lib/industry/inferIndustryTags'
import {
  parseSyncSource,
  smes24LookbackDays,
  SYNC_POLICY,
  syncSourcesFor,
  type SyncSource,
} from '@/lib/gov-support/sync/syncPolicy'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type ProgramSyncResult = {
  ok: boolean
  source: SyncSource
  bizinfoCount: number
  kstartupCount: number
  smes24Count: number
  totalFetched: number
  deduplicatedCount: number
  upsertedCount: number
  /** API에서 마감으로 판별되어 신규 upsert 생략한 건수 */
  skippedClosedCount: number
  /** DB에 이미 있던 행만 마감·비노출로 갱신한 건수 */
  closedMarkedCount: number
  bizinfoReportedTotal?: number
  truncated?: boolean
  policyNote: string
  errors?: string[]
}

function programToUpsertRow(p: NormalizedProgram) {
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
    visibility_status: 'visible' as const,
    synced_at: new Date().toISOString(),
  }
}

/** 마감 공고는 신규 insert 없이, 기존 DB 행만 상태 갱신 */
async function markExistingClosedPrograms(
  supabase: SupabaseClient<Database>,
  closedItems: NormalizedProgram[],
  errors: string[]
): Promise<number> {
  if (closedItems.length === 0) return 0

  const syncedAt = new Date().toISOString()
  let marked = 0
  const BATCH = 50

  const bySource = new Map<string, string[]>()
  for (const p of closedItems) {
    const list = bySource.get(p.source) ?? []
    list.push(p.external_id)
    bySource.set(p.source, list)
  }

  for (const [src, ids] of bySource) {
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH)
      const { data, error } = await supabase
        .from('support_programs')
        .update({
          status: 'closed',
          visibility_status: 'hidden',
          synced_at: syncedAt,
        })
        .eq('source', src)
        .in('external_id', chunk)
        .select('id')

      if (error) {
        errors.push(`closed 마킹 ${src} ${i}: ${error.message}`)
      } else {
        marked += data?.length ?? 0
      }
    }
  }

  return marked
}

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

function policyNoteFor(source: SyncSource): string {
  const onVercel = process.env.VERCEL === '1'
  const base =
    '실질적 전부: 기업마당 totCnt 전부 · K-Startup 모집중 · 중소벤처24 최근 ' +
    `${smes24LookbackDays()}일 · 마감(closed) 공고는 신규 저장 생략.`
  if (onVercel) {
    return `${base} Vercel 무료 플랜은 출처당 페이지 상한이 있어 전량은 로컬 npm run sync 권장.`
  }
  return `${base} 로컬 실행 — 출처별 페이지 무제한( totCnt까지 ).`
}

export async function runProgramSync(
  supabase: SupabaseClient<Database>,
  options?: { source?: SyncSource | string }
): Promise<ProgramSyncResult> {
  const source = parseSyncSource(options?.source)
  const targets = syncSourcesFor(source)
  const startedAt = new Date().toISOString()
  const errors: string[] = []

  let bizinfoCount = 0
  let kstartupCount = 0
  let smes24Count = 0
  let bizinfoReportedTotal: number | undefined
  let truncated = false

  const rawItems: NormalizedProgram[] = []

  if (targets.includes('bizinfo')) {
    try {
      const bizRaw = await withRetry(() => fetchAllBizinfoPages())
      bizinfoReportedTotal = bizRaw.reportedTotal || undefined
      truncated = bizRaw.truncated
      const items = bizRaw.items.map(normalizeBizinfoItem)
      rawItems.push(...items)
      bizinfoCount = items.length
    } catch (e: unknown) {
      errors.push(`bizinfo: ${e instanceof Error ? e.message : '오류'}`)
    }
  }

  if (targets.includes('kstartup')) {
    try {
      const list = await withRetry(() => fetchAllKStartupPages(SYNC_POLICY.kstartup.rcrtPrgsYn))
      const items = list.items.map(normalizeKStartupItem)
      rawItems.push(...items)
      kstartupCount = items.length
      truncated = truncated || list.truncated
    } catch (e: unknown) {
      errors.push(`kstartup: ${e instanceof Error ? e.message : '오류'}`)
    }
  }

  if (targets.includes('smes24')) {
    try {
      const list = await withRetry(() => fetchAllSmes24Pages())
      const items = list.items.map(normalizeSmes24Item)
      rawItems.push(...items)
      smes24Count = items.length
      truncated = truncated || list.truncated
    } catch (e: unknown) {
      errors.push(`smes24: ${e instanceof Error ? e.message : '오류'}`)
    }
  }

  const allItems = deduplicate(rawItems)
  const closedItems = allItems.filter((p) => p.status === 'closed')
  const openItems = allItems.filter((p) => p.status !== 'closed')
  const skippedClosedCount = closedItems.length

  let upsertedCount = 0
  const BATCH = 50
  for (let i = 0; i < openItems.length; i += BATCH) {
    const batch = openItems.slice(i, i + BATCH)
    const rows = batch.map(programToUpsertRow)

    const { error } = await supabase
      .from('support_programs')
      .upsert(rows, { onConflict: 'source,external_id' })

    if (error) {
      errors.push(`upsert 배치 ${i}-${i + BATCH}: ${error.message}`)
    } else {
      upsertedCount += batch.length
    }
  }

  const closedMarkedCount = await markExistingClosedPrograms(supabase, closedItems, errors)

  const fetchedBeforeDedup = bizinfoCount + kstartupCount + smes24Count
  const logSource =
    source === 'all' ? 'bizinfo_kstartup_smes24' : source

  await supabase.from('api_sync_logs').insert({
    source: logSource,
    status: errors.length === 0 ? 'success' : fetchedBeforeDedup > 0 ? 'partial' : 'failed',
    requested_count: fetchedBeforeDedup,
    inserted_count: upsertedCount,
    updated_count: 0,
    failed_count: errors.length,
    error_message: errors.length > 0 ? errors.join('; ') : null,
    started_at: startedAt,
    ended_at: new Date().toISOString(),
  })

  return {
    ok: errors.length === 0 && fetchedBeforeDedup > 0,
    source,
    bizinfoCount,
    kstartupCount,
    smes24Count,
    totalFetched: fetchedBeforeDedup,
    deduplicatedCount: allItems.length,
    upsertedCount,
    skippedClosedCount,
    closedMarkedCount,
    bizinfoReportedTotal,
    truncated: truncated || undefined,
    policyNote: policyNoteFor(source),
    errors: errors.length > 0 ? errors : undefined,
  }
}

export function createProgramSyncClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY_REQUIRED')
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
