import { fetchBizinfo } from '@/lib/gov-support/clients/bizinfo'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export type BizinfoCrossCheckResult = {
  ok: boolean
  api_unique_ids: number
  db_active_ids: number
  missing_in_db: { external_id: string; title: string }[]
  orphan_in_db: { id: string; external_id: string; title: string; synced_at: string | null }[]
  stale_sync_48h: { id: string; external_id: string; title: string; synced_at: string | null }[]
  pages_fetched: number
  truncated: boolean
  checked_at: string
  note?: string
  api_fetch_error?: string
  db_only?: boolean
}

function verifyMaxPages(): number {
  const n = Number(process.env.BIZINFO_VERIFY_MAX_PAGES ?? '8')
  return Number.isFinite(n) && n > 0 ? Math.min(n, 40) : 8
}

function pageDelayMs(): number {
  const n = Number(process.env.BIZINFO_VERIFY_PAGE_DELAY_MS ?? '250')
  return Number.isFinite(n) && n >= 0 ? n : 250
}

/** 기업마당 API에서 pblancId 집합 수집 (검증용 페이지 상한) */
export async function collectBizinfoApiIds(): Promise<{
  ids: Set<string>
  titles: Map<string, string>
  pagesFetched: number
  truncated: boolean
}> {
  const pageUnit = Math.min(100, Math.max(10, Number(process.env.SYNC_BIZINFO_PAGE_UNIT ?? 100)))
  const maxPages = verifyMaxPages()
  const ids = new Set<string>()
  const titles = new Map<string, string>()
  let pageIndex = 1
  let reportedTotal = 0

  while (pageIndex <= maxPages) {
    const r = await fetchBizinfo({ pageIndex, pageUnit })
    if (pageIndex === 1) reportedTotal = r.totalCount
    for (const row of r.list) {
      const id = row.pblancId ? String(row.pblancId) : ''
      if (!id) continue
      ids.add(id)
      titles.set(id, row.pblancNm ?? id)
    }
    if (r.list.length === 0) break
    if (r.list.length < pageUnit) break
    if (reportedTotal > 0 && ids.size >= reportedTotal) break
    pageIndex++
    if (pageIndex <= maxPages && pageDelayMs() > 0) {
      await new Promise((resolve) => setTimeout(resolve, pageDelayMs()))
    }
  }

  const truncated =
    reportedTotal > 0 ? ids.size < reportedTotal && pageIndex > maxPages - 1 : pageIndex >= maxPages

  return { ids, titles, pagesFetched: pageIndex, truncated }
}

export async function runBizinfoCrossCheck(
  supabase: SupabaseClient<Database>
): Promise<BizinfoCrossCheckResult> {
  const checkedAt = new Date().toISOString()
  let apiIds = new Set<string>()
  let titles = new Map<string, string>()
  let pagesFetched = 0
  let truncated = false
  let apiFetchError: string | undefined

  try {
    const collected = await collectBizinfoApiIds()
    apiIds = collected.ids
    titles = collected.titles
    pagesFetched = collected.pagesFetched
    truncated = collected.truncated
  } catch (e) {
    apiFetchError = e instanceof Error ? e.message : '기업마당 API 호출 실패'
    console.error('[bizinfoCrossCheck]', apiFetchError)
  }

  const { data: dbRows, error } = await supabase
    .from('support_programs')
    .select('id, external_id, title, synced_at, status')
    .eq('source', 'bizinfo')
    .neq('status', 'inactive')
    .limit(5000)

  if (error) {
    throw new Error(error.message)
  }

  const dbMap = new Map<string, (typeof dbRows)[number]>()
  for (const row of dbRows ?? []) {
    dbMap.set(String(row.external_id), row)
  }

  const missing_in_db: BizinfoCrossCheckResult['missing_in_db'] = []
  if (apiIds.size > 0) {
    for (const extId of apiIds) {
      if (!dbMap.has(extId)) {
        missing_in_db.push({ external_id: extId, title: titles.get(extId) ?? extId })
      }
    }
    missing_in_db.sort((a, b) => a.title.localeCompare(b.title, 'ko'))
  }

  const orphan_in_db: BizinfoCrossCheckResult['orphan_in_db'] = []
  const stale_sync_48h: BizinfoCrossCheckResult['stale_sync_48h'] = []
  const staleCutoff = Date.now() - 48 * 60 * 60 * 1000

  for (const row of dbRows ?? []) {
    const extId = String(row.external_id)
    if (apiIds.size > 0 && !apiIds.has(extId)) {
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

  const notes: string[] = []
  if (apiFetchError) {
    notes.push(
      '기업마당 API 호출에 실패해 DB 기준 검증만 표시합니다. (Vercel IP 차단·일시 장애 가능) 로컬 `npm run sync`로 API·키를 확인하세요.'
    )
  } else if (apiIds.size === 0) {
    notes.push(
      process.env.BIZINFO_API_KEY
        ? 'API 응답이 비었습니다. BIZINFO_API_KEY를 확인하세요.'
        : 'BIZINFO_API_KEY 미설정'
    )
  } else if (truncated) {
    notes.push(
      `API 전체 대비 샘플 검증입니다 (최대 ${verifyMaxPages()}페이지). BIZINFO_VERIFY_MAX_PAGES로 조정 가능.`
    )
  }

  return {
    ok: !apiFetchError && apiIds.size > 0,
    api_unique_ids: apiIds.size,
    db_active_ids: dbMap.size,
    missing_in_db: missing_in_db.slice(0, 100),
    orphan_in_db: orphan_in_db.slice(0, 100),
    stale_sync_48h: stale_sync_48h.slice(0, 100),
    pages_fetched: pagesFetched,
    truncated,
    checked_at: checkedAt,
    note: notes.length > 0 ? notes.join(' ') : undefined,
    api_fetch_error: apiFetchError,
    db_only: Boolean(apiFetchError),
  }
}
