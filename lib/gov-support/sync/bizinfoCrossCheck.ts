import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { runSyncVerify, type SourceVerifyReport } from '@/lib/gov-support/sync/syncVerify'

export type BizinfoCrossCheckResult = {
  ok: boolean
  api_unique_ids: number
  db_active_ids: number
  /** @deprecated missing_open 과 동일 — 모집중·저장 대상만 */
  missing_in_db: { external_id: string; title: string }[]
  missing_open: { external_id: string; title: string }[]
  skipped_closed_count: number
  sync_health: SourceVerifyReport['health']
  orphan_in_db: { id: string; external_id: string; title: string; synced_at: string | null }[]
  stale_sync_48h: { id: string; external_id: string; title: string; synced_at: string | null }[]
  pages_fetched: number
  truncated: boolean
  checked_at: string
  note?: string
  api_fetch_error?: string
  db_only?: boolean
}

function toLegacyBizinfoResult(
  report: SourceVerifyReport,
  checkedAt: string
): BizinfoCrossCheckResult {
  return {
    ok: report.health === 'ok',
    api_unique_ids: report.api_total_ids,
    db_active_ids: report.db_stored_ids,
    missing_in_db: report.missing_open,
    missing_open: report.missing_open,
    skipped_closed_count: report.skipped_closed,
    sync_health: report.health,
    orphan_in_db: report.orphan_in_db,
    stale_sync_48h: report.stale_sync_48h,
    pages_fetched: report.pages_fetched,
    truncated: report.truncated,
    checked_at: checkedAt,
    note: report.note,
    api_fetch_error: report.api_fetch_error,
    db_only: report.health === 'api_error',
  }
}

/** 기업마당 — runSyncVerify와 동일 기준(마감 생략·페이지 상한 반영) */
export async function runBizinfoCrossCheck(
  supabase: SupabaseClient<Database>
): Promise<BizinfoCrossCheckResult> {
  const summary = await runSyncVerify(supabase, { source: 'bizinfo' })
  const report = summary.sources[0]
  if (!report) {
    throw new Error('bizinfo 검증 결과 없음')
  }
  return toLegacyBizinfoResult(report, summary.checked_at)
}
