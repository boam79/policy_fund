import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import {
  compareSourcePrograms,
  fetchProgramsForSource,
  loadDbRows,
  type ProgramSource,
  type SourceVerifyReport,
} from '@/lib/gov-support/sync/syncVerify'
import { upsertOpenPrograms } from '@/lib/gov-support/sync/programUpsert'
import {
  parseSyncSource,
  syncSourcesFor,
  type SyncSource,
} from '@/lib/gov-support/sync/syncPolicy'

export type HealSourceResult = {
  source: ProgramSource
  ok: boolean
  healed: number
  missing_before: number
  truncated: boolean
  skipped_incomplete: boolean
  error?: string
}

export type HealSummary = {
  ok: boolean
  sources: HealSourceResult[]
  total_healed: number
}

export function healMaxIds(): number {
  const onVercel = process.env.VERCEL === '1'
  const fallback = onVercel ? 50 : 500
  const n = Number(process.env.SYNC_HEAL_MAX_IDS ?? String(fallback))
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : fallback
}

/** 출처 1개 — 검증 후 missing_open만 upsert */
export async function healSourceGaps(
  supabase: SupabaseClient<Database>,
  source: ProgramSource,
  options?: { maxIds?: number }
): Promise<HealSourceResult> {
  const maxIds = options?.maxIds ?? healMaxIds()
  const errors: string[] = []

  const fetched = await fetchProgramsForSource(source)
  if (fetched.apiFetchError) {
    return {
      source,
      ok: false,
      healed: 0,
      missing_before: 0,
      truncated: false,
      skipped_incomplete: false,
      error: fetched.apiFetchError,
    }
  }

  const dbRows = await loadDbRows(supabase, source)
  const report = compareSourcePrograms(source, fetched.programs, dbRows, {
    truncated: fetched.truncated,
    reportedTotal: fetched.reportedTotal,
    pagesFetched: fetched.pagesFetched,
  })

  const missingBefore = report.missing_open.length

  if (fetched.truncated && missingBefore > 0) {
    return {
      source,
      ok: false,
      healed: 0,
      missing_before: missingBefore,
      truncated: true,
      skipped_incomplete: true,
      error: '페이지 상한으로 API가 불완전합니다. 로컬 npm run sync 로 전량 수집하세요.',
    }
  }

  const targetIds = new Set(
    report.missing_open.slice(0, maxIds).map((r) => r.external_id)
  )
  const toUpsert = fetched.programs.filter(
    (p) => p.source === source && targetIds.has(p.external_id) && p.status !== 'closed'
  )

  const healed = await upsertOpenPrograms(supabase, toUpsert, errors)

  return {
    source,
    ok: errors.length === 0 && (missingBefore === 0 || healed > 0),
    healed,
    missing_before: missingBefore,
    truncated: fetched.truncated,
    skipped_incomplete: false,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  }
}

export async function runSyncHeal(
  supabase: SupabaseClient<Database>,
  options?: { source?: SyncSource | string; maxIds?: number }
): Promise<HealSummary> {
  const source = parseSyncSource(options?.source)
  const targets = syncSourcesFor(source)
  const sources: HealSourceResult[] = []

  for (const src of targets) {
    sources.push(
      await healSourceGaps(supabase, src, { maxIds: options?.maxIds })
    )
  }

  const total_healed = sources.reduce((n, s) => n + s.healed, 0)
  const ok = sources.every((s) => s.ok || (s.missing_before === 0 && !s.error))

  return { ok, sources, total_healed }
}

export function healMessage(summary: HealSummary): string {
  const parts = summary.sources.map((s) => {
    if (s.skipped_incomplete) return `${s.source}: 보강 생략(불완전 API)`
    if (s.missing_before === 0) return `${s.source}: 갭 없음`
    return `${s.source}: ${s.healed}/${s.missing_before}건 보강`
  })
  return parts.join(' · ')
}

export function reportAfterHealHint(report: SourceVerifyReport): string | undefined {
  if (report.health === 'ok') return undefined
  if (report.health === 'incomplete_sync') {
    return '검증 후에도 페이지 상한이면 로컬 전량 동기화가 필요합니다.'
  }
  if (report.health === 'gaps' && report.missing_open.length > 0) {
    return `미저장 ${report.missing_open.length}건+ — 보강 동기화를 실행하세요.`
  }
  return undefined
}
