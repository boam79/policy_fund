/**
 * 3출처 동기화와 동일한 fetch·정규화 기준으로 API vs DB 검증.
 * - missing_open: 저장 대상(비마감)인데 DB 행 없음
 * - skipped_closed: API 마감 — 신규 upsert 생략(의도, 누락 아님)
 */

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
import {
  parseSyncSource,
  smes24LookbackDays,
  SYNC_POLICY,
  syncSourcesFor,
  type SyncSource,
} from '@/lib/gov-support/sync/syncPolicy'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export type ProgramSource = 'bizinfo' | 'kstartup' | 'smes24'
export type SyncHealth = 'ok' | 'incomplete_sync' | 'gaps' | 'api_error'

export type SourceGapRow = { external_id: string; title: string }

export type SourceOrphanRow = {
  id: string
  external_id: string
  title: string
  synced_at: string | null
}

export type DbProgramRow = {
  id: string
  external_id: string
  title: string
  synced_at: string | null
  status: string | null
  application_end_date: string | null
}

export type SourceVerifyReport = {
  source: ProgramSource
  label: string
  health: SyncHealth
  api_fetch_error?: string
  api_total_ids: number
  api_open_ids: number
  skipped_closed: number
  db_stored_ids: number
  missing_open: SourceGapRow[]
  orphan_in_db: SourceOrphanRow[]
  stale_sync_48h: SourceOrphanRow[]
  reported_total?: number
  truncated: boolean
  pages_fetched: number
  note?: string
}

export type SyncVerifySummary = {
  ok: boolean
  checked_at: string
  sources: SourceVerifyReport[]
  overall_health: SyncHealth
}

const LIST_LIMIT = 100
const STALE_MS = 48 * 60 * 60 * 1000

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
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

function lookbackCutoffIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - smes24LookbackDays())
  return d.toISOString().slice(0, 10)
}

/** smes24: lookback 밖 DB 행은 유령 후보에서 제외 */
export function isSmes24OutsideLookback(row: DbProgramRow, cutoffDate: string): boolean {
  if (row.application_end_date) {
    return row.application_end_date < cutoffDate
  }
  if (row.synced_at) {
    return row.synced_at.slice(0, 10) < cutoffDate
  }
  return false
}

export function shouldCountOrphan(
  source: ProgramSource,
  row: DbProgramRow,
  apiIds: Set<string>,
  lookbackCutoff: string
): boolean {
  if (apiIds.size === 0) return false
  const extId = String(row.external_id)
  if (apiIds.has(extId)) return false
  if (source === 'kstartup' && row.status === 'closed') return false
  if (source === 'smes24' && isSmes24OutsideLookback(row, lookbackCutoff)) return false
  return true
}

export function pickHealth(
  apiFetchError: string | undefined,
  truncated: boolean,
  missingOpenCount: number
): SyncHealth {
  if (apiFetchError) return 'api_error'
  if (truncated) return 'incomplete_sync'
  if (missingOpenCount > 0) return 'gaps'
  return 'ok'
}

/** API 정규화 결과를 DB 행과 비교 (순수 함수) */
export function compareSourcePrograms(
  source: ProgramSource,
  programs: NormalizedProgram[],
  dbRows: DbProgramRow[],
  meta: {
    truncated: boolean
    reportedTotal?: number
    apiFetchError?: string
    pagesFetched: number
    listLimit?: number
  }
): SourceVerifyReport {
  const listLimit = meta.listLimit ?? LIST_LIMIT
  const lookbackCutoff = lookbackCutoffIso()

  const bySource = programs.filter((p) => p.source === source && p.external_id)
  const openPrograms = bySource.filter((p) => p.status !== 'closed')
  const closedCount = bySource.length - openPrograms.length

  const apiAllIds = new Set(bySource.map((p) => p.external_id))
  const openIdSet = new Set(openPrograms.map((p) => p.external_id))
  const titleById = new Map(bySource.map((p) => [p.external_id, p.title]))

  const dbMap = new Map<string, DbProgramRow>()
  for (const row of dbRows) {
    dbMap.set(String(row.external_id), row)
  }

  const missing_open: SourceGapRow[] = []
  if (!meta.apiFetchError && openIdSet.size > 0) {
    for (const extId of openIdSet) {
      if (!dbMap.has(extId)) {
        missing_open.push({
          external_id: extId,
          title: titleById.get(extId) ?? extId,
        })
      }
    }
    missing_open.sort((a, b) => a.title.localeCompare(b.title, 'ko'))
  }

  const orphan_in_db: SourceOrphanRow[] = []
  const stale_sync_48h: SourceOrphanRow[] = []
  const staleCutoff = Date.now() - STALE_MS

  for (const row of dbRows) {
    const extId = String(row.external_id)
    if (shouldCountOrphan(source, row, apiAllIds, lookbackCutoff)) {
      orphan_in_db.push({
        id: row.id,
        external_id: extId,
        title: row.title,
        synced_at: row.synced_at,
      })
    }
    const synced = row.synced_at ? new Date(row.synced_at).getTime() : 0
    if (!synced || synced < staleCutoff) {
      stale_sync_48h.push({
        id: row.id,
        external_id: extId,
        title: row.title,
        synced_at: row.synced_at,
      })
    }
  }

  orphan_in_db.sort((a, b) => a.title.localeCompare(b.title, 'ko'))

  const health = pickHealth(meta.apiFetchError, meta.truncated, missing_open.length)
  const notes: string[] = []

  if (meta.apiFetchError) {
    notes.push(`${SYNC_POLICY[source].label} API 호출 실패 — DB 기준만 표시.`)
  } else if (apiAllIds.size === 0) {
    notes.push(`${SYNC_POLICY[source].label} API 응답이 비었습니다.`)
  } else if (meta.truncated) {
    notes.push(
      `동기화 페이지 상한으로 API를 일부만 수집했습니다. 「DB 누락」은 불완전 동기화일 수 있습니다. 로컬 npm run sync 권장.`
    )
  } else if (closedCount > 0) {
    notes.push(`마감 ${closedCount}건은 동기화 정책상 신규 저장 생략(누락 아님).`)
  }

  if (source === 'kstartup') {
    notes.push('K-Startup: API는 모집중(Y)만 수집 — DB 마감 행은 유령에서 제외.')
  }
  if (source === 'smes24') {
    notes.push(`중소벤처24: 최근 ${smes24LookbackDays()}일 밖 DB 행은 유령에서 제외.`)
  }

  return {
    source,
    label: SYNC_POLICY[source].label,
    health,
    api_fetch_error: meta.apiFetchError,
    api_total_ids: apiAllIds.size,
    api_open_ids: openIdSet.size,
    skipped_closed: closedCount,
    db_stored_ids: dbMap.size,
    missing_open: missing_open.slice(0, listLimit),
    orphan_in_db: orphan_in_db.slice(0, listLimit),
    stale_sync_48h: stale_sync_48h.slice(0, listLimit),
    reported_total: meta.reportedTotal,
    truncated: meta.truncated,
    pages_fetched: meta.pagesFetched,
    note: notes.length > 0 ? notes.join(' ') : undefined,
  }
}

export async function fetchProgramsForSource(source: ProgramSource): Promise<{
  programs: NormalizedProgram[]
  truncated: boolean
  reportedTotal?: number
  pagesFetched: number
  apiFetchError?: string
}> {
  try {
    if (source === 'bizinfo') {
      const r = await withRetry(() => fetchAllBizinfoPages())
      const programs = r.items.map(normalizeBizinfoItem)
      return {
        programs: deduplicate(programs),
        truncated: r.truncated,
        reportedTotal: r.reportedTotal || undefined,
        pagesFetched: r.pagesFetched,
      }
    }
    if (source === 'kstartup') {
      const r = await withRetry(() => fetchAllKStartupPages(SYNC_POLICY.kstartup.rcrtPrgsYn))
      const programs = r.items.map(normalizeKStartupItem)
      return {
        programs: deduplicate(programs),
        truncated: r.truncated,
        reportedTotal: r.reportedTotal || undefined,
        pagesFetched: r.pagesFetched,
      }
    }
    const r = await withRetry(() => fetchAllSmes24Pages())
    const programs = r.items.map(normalizeSmes24Item)
    return {
      programs: deduplicate(programs),
      truncated: r.truncated,
      reportedTotal: r.reportedTotal || undefined,
      pagesFetched: r.pagesFetched,
    }
  } catch (e) {
    return {
      programs: [],
      truncated: false,
      pagesFetched: 0,
      apiFetchError: e instanceof Error ? e.message : `${source} API 호출 실패`,
    }
  }
}

export async function loadDbRows(
  supabase: SupabaseClient<Database>,
  source: ProgramSource
): Promise<DbProgramRow[]> {
  const { data, error } = await supabase
    .from('support_programs')
    .select('id, external_id, title, synced_at, status, application_end_date')
    .eq('source', source)
    .neq('status', 'inactive')
    .limit(5000)

  if (error) throw new Error(error.message)
  return (data ?? []) as DbProgramRow[]
}

function overallHealth(sources: SourceVerifyReport[]): SyncHealth {
  if (sources.some((s) => s.health === 'api_error')) return 'api_error'
  if (sources.some((s) => s.health === 'incomplete_sync')) return 'incomplete_sync'
  if (sources.some((s) => s.health === 'gaps')) return 'gaps'
  return 'ok'
}

export async function verifySource(
  supabase: SupabaseClient<Database>,
  source: ProgramSource,
  options?: { listLimit?: number }
): Promise<SourceVerifyReport> {
  const fetched = await fetchProgramsForSource(source)
  const dbRows = await loadDbRows(supabase, source)
  return compareSourcePrograms(source, fetched.programs, dbRows, {
    truncated: fetched.truncated,
    reportedTotal: fetched.reportedTotal,
    apiFetchError: fetched.apiFetchError,
    pagesFetched: fetched.pagesFetched,
    listLimit: options?.listLimit,
  })
}

export async function runSyncVerify(
  supabase: SupabaseClient<Database>,
  options?: { source?: SyncSource | string; listLimit?: number }
): Promise<SyncVerifySummary> {
  const source = parseSyncSource(options?.source)
  const targets = syncSourcesFor(source)
  const checkedAt = new Date().toISOString()

  const sources: SourceVerifyReport[] = []
  for (const src of targets) {
    sources.push(await verifySource(supabase, src, { listLimit: options?.listLimit }))
  }

  const health = overallHealth(sources)
  return {
    ok: health === 'ok',
    checked_at: checkedAt,
    sources,
    overall_health: health,
  }
}
