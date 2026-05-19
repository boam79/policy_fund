import type { BizinfoItem } from '../clients/bizinfo'
import type { NormalizedProgram } from './normalizer'
import { buildProgramSearchText } from './buildProgramSearchText'

/** 제목 `[경기]` 등 광역 표기 */
const BRACKET_REGION = /\[([가-힣]{2,4})\]/

const REGION_KEYS = [
  '서울',
  '경기',
  '인천',
  '부산',
  '대구',
  '광주',
  '대전',
  '울산',
  '세종',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
  '전국',
] as const

/** API별 신청·참고 URL 필드 (기업마당 / 중소벤처24 / K-Startup) */
const DEDICATED_URL_KEYS = [
  'rceptEngnHmpgUrl',
  'reqstLinkInfo',
  'refrncUrl',
  'detl_pg_url',
  'pblancDtlUrl',
  'pbancUrl',
  'pblancUrl',
] as const

/** HTML 본문에 지역 포털 URL이 포함되는 필드 */
const HTML_CONTENT_KEYS = [
  'bsnsSumryCn',
  'reqstMthPapersCn',
  'sportCnts',
  'policyCnts',
  'reqstRcept',
  'sportMg',
] as const

const URL_IN_TEXT_RE = /https?:\/\/[^\s"'<>)\]]+/gi

/** 첨부·기업마당 상세 등 신청 URL로 부적합한 패턴 */
const LOW_PRIORITY_URL_RE =
  /bizinfo\.go\.kr|smes\.go\.kr\/comm\/getFile|\/cmm\/fms\/getImageFile/i

function decodeHtmlEntities(url: string): string {
  return url.replace(/&amp;/g, '&').trim()
}

function extractUrlsFromText(text: string): string[] {
  return [...text.matchAll(URL_IN_TEXT_RE)].map((m) =>
    decodeHtmlEntities(m[0].replace(/[.,;:]+$/, ''))
  )
}

function urlPriority(url: string, key?: string): number {
  if (key === 'rceptEngnHmpgUrl' || key === 'reqstLinkInfo') return 100
  if (key === 'refrncUrl' || key === 'detl_pg_url') return 90
  if (LOW_PRIORITY_URL_RE.test(url)) return 10
  if (/forms\.gle|buly\.kr|naver\.me/i.test(url)) return 40
  return 70
}

/** raw·본문·기존 URL에서 후보 수집 */
export function collectApplicationUrlCandidates(
  raw: Record<string, unknown>,
  fallback?: string | null
): Array<{ url: string; priority: number }> {
  const candidates: Array<{ url: string; priority: number }> = []
  const seen = new Set<string>()

  const add = (url: string, priority: number) => {
    const normalized = decodeHtmlEntities(url.trim())
    if (!normalized.startsWith('http')) return
    const dedupeKey = normalized.toLowerCase()
    if (seen.has(dedupeKey)) return
    seen.add(dedupeKey)
    candidates.push({ url: normalized, priority })
  }

  if (fallback) add(fallback, 50)

  for (const key of DEDICATED_URL_KEYS) {
    const v = raw[key]
    if (typeof v === 'string' && v.trim()) {
      add(v, urlPriority(v, key))
    }
  }

  const aply = raw.aplyMthd
  if (typeof aply === 'string' && aply.includes('http')) {
    for (const u of extractUrlsFromText(aply)) add(u, 60)
  }

  for (const key of HTML_CONTENT_KEYS) {
    const html = raw[key]
    if (typeof html === 'string') {
      for (const u of extractUrlsFromText(html)) {
        add(u, urlPriority(u))
      }
    }
  }

  return candidates
}

/** 지역 포털·IRIS·지원둥지 등 실제 신청 URL 우선 선택 */
export function pickBestApplicationUrl(
  raw: Record<string, unknown>,
  fallback?: string | null
): string | null {
  const candidates = collectApplicationUrlCandidates(raw, fallback)
  if (!candidates.length) return null
  candidates.sort((a, b) => b.priority - a.priority)
  return candidates[0].url
}

/** 기업마당·중소벤처24 raw — 지역 포털(지원둥지·경기기업비서 등) 신청 URL */
export function portalApplicationUrlFromRaw(raw: Record<string, unknown>): string | null {
  const dedicated = collectApplicationUrlCandidates(raw, null).filter((c) => c.priority >= 90)
  if (dedicated.length) {
    dedicated.sort((a, b) => b.priority - a.priority)
    return dedicated[0].url
  }

  const best = pickBestApplicationUrl(raw, null)
  if (best && !LOW_PRIORITY_URL_RE.test(best)) return best
  return null
}

export function pickBizinfoApplicationUrl(item: BizinfoItem): string | null {
  return pickBestApplicationUrl(
    item as unknown as Record<string, unknown>,
    item.pblancUrl?.trim() || null
  )
}

/** 공고명·기관명에서 광역시도 추론 (예: `[경기] 광명시 …`) */
export function inferRegionFromProgramText(
  title: string,
  organization?: string | null
): string | null {
  const bracket = title.match(BRACKET_REGION)?.[1]
  if (bracket && (REGION_KEYS as readonly string[]).includes(bracket)) {
    return bracket
  }

  const haystack = `${title} ${organization ?? ''}`
  for (const key of REGION_KEYS) {
    if (key === '전국') continue
    if (haystack.includes(key)) return key
  }
  return null
}

/** 동기화·upsert 직전 region·application_url 보강 */
export function enrichNormalizedProgram(p: NormalizedProgram): NormalizedProgram & {
  search_text?: string | null
} {
  const raw = p.raw_content as Record<string, unknown>
  const region = p.region?.trim() || inferRegionFromProgramText(p.title, p.organization)
  const application_url = pickBestApplicationUrl(raw, p.application_url) || p.application_url
  const search_text = buildProgramSearchText({
    external_id: p.external_id,
    application_url,
    raw_content: raw,
  })

  return {
    ...p,
    region: region || p.region,
    application_url,
    search_text,
  }
}
