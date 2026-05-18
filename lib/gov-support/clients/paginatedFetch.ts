/**
 * 세 출처 공통 패턴 — 페이지 단위 호출 후 totalCount 또는 짧은 페이지까지 순회.
 * SYNC_MAX_PAGES (>0)로 페이지 상한 두면 서버리스 타임아웃 완화에 사용 가능.
 */

import type { BizinfoItem } from './bizinfo'
import { fetchBizinfo, BIZINFO_PRIMARY_SYNC_FIELDS } from './bizinfo'
import type { KStartupItem } from './kstartup'
import { fetchKStartup } from './kstartup'
import type { Smes24Item } from './smes24'
import { fetchSmes24 } from './smes24'
import { smes24LookbackDays, vercelMaxPagesPerSource } from '@/lib/gov-support/sync/syncPolicy'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function pageDelayMs(): number {
  const onVercel = process.env.VERCEL === '1'
  const fallback = onVercel ? 200 : 400
  const n = Number(process.env.SYNC_PAGE_DELAY_MS ?? String(fallback))
  return Math.max(0, Number.isFinite(n) ? n : fallback)
}

export type PaginatedFetchResult<T> = {
  items: T[]
  reportedTotal: number
  pagesFetched: number
  truncated: boolean
}

/**
 * 출처별 최대 페이지 수
 * - SYNC_MAX_PAGES>0 이면 그만큼 적용
 * - Vercel: vercelMaxPagesPerSource() (기본 10, Hobby 타임아웃 완화)
 * - 로컬: 무제한 → totCnt까지
 */
function maxPagesPerSource(): number {
  const explicit = Number(process.env.SYNC_MAX_PAGES ?? '')
  if (Number.isFinite(explicit) && explicit > 0) return explicit

  if (process.env.VERCEL === '1') {
    return vercelMaxPagesPerSource()
  }

  return Number.POSITIVE_INFINITY
}

/**
 * 기업마당 — 우선 분야 미지정(전체) 페이징, 0건이면 분야별 페이징 폴백 (pblancId 중복 제거)
 */
export async function fetchAllBizinfoPages(): Promise<PaginatedFetchResult<BizinfoItem>> {
  const pageUnit = Math.min(100, Math.max(10, Number(process.env.SYNC_BIZINFO_PAGE_UNIT ?? 100)))
  const delay = pageDelayMs()
  const maxPages = maxPagesPerSource()

  const globalList: BizinfoItem[] = []
  let reportedTotal = 0
  let pageIndex = 1

  while (pageIndex <= maxPages) {
    const r = await fetchBizinfo({ pageIndex, pageUnit })
    if (pageIndex === 1) reportedTotal = r.totalCount
    globalList.push(...r.list)
    if (r.list.length === 0) break
    if (r.list.length < pageUnit) break
    if (reportedTotal > 0 && globalList.length >= reportedTotal) break
    pageIndex++
    if (delay > 0) await sleep(delay)
  }

  if (globalList.length > 0) {
    const truncated =
      Number.isFinite(maxPages) &&
      reportedTotal > 0 &&
      globalList.length < reportedTotal &&
      pageIndex > maxPages
    return {
      items: globalList,
      reportedTotal,
      pagesFetched: pageIndex,
      truncated,
    }
  }

  const merged: BizinfoItem[] = []
  const seenIds = new Set<string>()

  for (const field of BIZINFO_PRIMARY_SYNC_FIELDS) {
    pageIndex = 1
    let fieldReportedTotal = 0
    while (pageIndex <= maxPages) {
      const r = await fetchBizinfo({ field, pageIndex, pageUnit })
      if (pageIndex === 1) fieldReportedTotal = r.totalCount
      for (const row of r.list) {
        const id = row?.pblancId ? String(row.pblancId) : ''
        if (!id || seenIds.has(id)) continue
        seenIds.add(id)
        merged.push(row)
      }
      if (r.list.length === 0) break
      if (r.list.length < pageUnit) break
      if (fieldReportedTotal > 0 && pageIndex * pageUnit >= fieldReportedTotal) break
      pageIndex++
      if (delay > 0) await sleep(delay)
    }
    if (delay > 0) await sleep(Math.min(delay, 500))
  }

  const truncated =
    Number.isFinite(maxPages) &&
    merged.length > 0 &&
    reportedTotal > 0 &&
    merged.length < reportedTotal

  return {
    items: merged,
    reportedTotal: reportedTotal || merged.length,
    pagesFetched: pageIndex,
    truncated,
  }
}

/** K-Startup — totalCount 또는 마지막 짧은 페이지까지 (모집 중 Y) */
export async function fetchAllKStartupPages(
  rcrtPrgsYn: 'Y' | 'N' = 'Y'
): Promise<PaginatedFetchResult<KStartupItem>> {
  const numOfRows = Math.min(100, Math.max(1, Number(process.env.SYNC_KSTARTUP_NUM_ROWS ?? 100)))
  const delay = pageDelayMs()
  const maxPages = maxPagesPerSource()

  const acc: KStartupItem[] = []
  let pageNo = 1
  let reportedTotal = 0

  while (pageNo <= maxPages) {
    const r = await fetchKStartup({ rcrtPrgsYn, pageNo, numOfRows })
    if (pageNo === 1) reportedTotal = r.totalCount
    acc.push(...r.list)
    if (r.list.length === 0) break
    if (r.list.length < numOfRows) break
    if (reportedTotal > 0 && acc.length >= reportedTotal) break
    pageNo++
    if (delay > 0) await sleep(delay)
  }

  const truncated =
    Number.isFinite(maxPages) && reportedTotal > 0 && acc.length < reportedTotal && pageNo > maxPages

  return {
    items: acc,
    reportedTotal,
    pagesFetched: pageNo,
    truncated,
  }
}

function formatSmesDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/**
 * 중소벤처24 — 동일 페이징 패턴 (조회 구간: smes24LookbackDays 기본 730일)
 */
export async function fetchAllSmes24Pages(): Promise<PaginatedFetchResult<Smes24Item>> {
  const delay = pageDelayMs()
  const maxPages = maxPagesPerSource()
  const numOfRows = Math.min(
    500,
    Math.max(10, Number(process.env.SYNC_SMES24_PAGE_SIZE ?? 100))
  )
  const now = new Date()
  const endDtDefault = formatSmesDate(now)
  const lookbackDays = smes24LookbackDays()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - lookbackDays)
  const strDt = process.env.SMES24_SYNC_STRDT ?? formatSmesDate(startDate)
  const endDt = process.env.SMES24_SYNC_ENDDT ?? endDtDefault

  const acc: Smes24Item[] = []
  let pageNo = 1
  let reportedTotal = 0

  while (pageNo <= maxPages) {
    const r = await fetchSmes24({ strDt, endDt, pageNo, numOfRows })
    if (pageNo === 1) reportedTotal = r.totalCount
    acc.push(...r.list)
    if (r.list.length === 0) break
    if (r.list.length < numOfRows) break
    if (reportedTotal > 0 && acc.length >= reportedTotal) break
    pageNo++
    if (delay > 0) await sleep(delay)
  }

  const truncated =
    Number.isFinite(maxPages) && reportedTotal > 0 && acc.length < reportedTotal && pageNo > maxPages

  return {
    items: acc,
    reportedTotal,
    pagesFetched: pageNo,
    truncated,
  }
}
