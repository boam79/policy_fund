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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function pageDelayMs(): number {
  return Math.max(0, Number(process.env.SYNC_PAGE_DELAY_MS ?? 400))
}

/**
 * 출처별 최대 페이지 수
 * - SYNC_MAX_PAGES>0 이면 그만큼 적용 (로컬·서버 동일 우선 적용)
 * - 미설정 + Vercel 런타임이면 SYNC_VERCEL_SAFE_MAX_PAGES 기본값(페이지 과다로 타임아웃 방지)
 * - 그 외(로컬 npm run sync 등): 무제한
 */
function maxPagesPerSource(): number {
  const explicit = Number(process.env.SYNC_MAX_PAGES ?? '')
  if (Number.isFinite(explicit) && explicit > 0) return explicit

  if (process.env.VERCEL === '1') {
    const fallback = Number(process.env.SYNC_VERCEL_SAFE_MAX_PAGES ?? '48')
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 48
  }

  return Number.POSITIVE_INFINITY
}

/**
 * 기업마당 — 우선 분야 미지정(전체) 페이징, 0건이면 분야별 페이징 폴백 (pblancId 중복 제거)
 */
export async function fetchAllBizinfoPages(): Promise<BizinfoItem[]> {
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
    return globalList
  }

  // 폴백: 분야별 페이지네이션 (동일 패턴 — 짧아질 때까지 페이지 증가)
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

  return merged
}

/** K-Startup — totalCount 또는 마지막 짧은 페이지까지 */
export async function fetchAllKStartupPages(rcrtPrgsYn: 'Y' | 'N' = 'Y'): Promise<KStartupItem[]> {
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

  return acc
}

function formatSmesDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/**
 * 중소벤처24 — 동일 페이징 패턴 (조회 구간은 lookback 일수로 통일 기본값 730일).
 */
export async function fetchAllSmes24Pages(): Promise<Smes24Item[]> {
  const delay = pageDelayMs()
  const maxPages = maxPagesPerSource()
  const numOfRows = Math.min(
    500,
    Math.max(10, Number(process.env.SYNC_SMES24_PAGE_SIZE ?? 100))
  )
  const now = new Date()
  const endDtDefault = formatSmesDate(now)
  const lookbackDays = Math.min(3660, Math.max(1, Number(process.env.SYNC_SMES24_LOOKBACK_DAYS ?? 730)))
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

  return acc
}
