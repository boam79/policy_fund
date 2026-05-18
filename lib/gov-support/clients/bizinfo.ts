import { SITE_BOT_USER_AGENT } from '@/lib/site-config'

/**
 * 기업마당(bizinfo.go.kr) 공고 API 클라이언트
 * 환경변수 BIZINFO_API_KEY 필요
 * https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do
 * 실제 응답: { jsonArray: [...], totCnt }
 */

export interface BizinfoItem {
  pblancId: string                     // 공고 ID
  pblancNm: string                     // 공고명
  jrsdInsttNm?: string                 // 주관기관명 (실제 필드명)
  jurMnofNm?: string                   // 주관기관명 (이전 필드명 호환)
  reqstBeginEndDe?: string             // 접수기간 (예: "20260101 ~ 20260331")
  rceptBgnde?: string                  // 접수시작일 (YYYYMMDD)
  rceptEndde?: string                  // 접수종료일 (YYYYMMDD)
  pldirSportRealmLclasCodeNm?: string  // 지원분야명 (대분류)
  bizTpNm?: string                     // 지원분야명 (호환)
  pblancUrl: string                    // 공고 URL
  trgetNm?: string                     // 지원대상
  tgMbrCndCont?: string                // 지원대상 (호환)
  bsnsSumryCn?: string                 // 지원내용 요약
  sprtCnts?: string                    // 지원내용 (호환)
  rqDocuCont?: string                  // 필요서류
  reqstMthPapersCn?: string            // 필요서류 (실제 필드명)
  refrncNm?: string                    // 참고기관명
  totCnt?: number                      // 전체 건수
}

export interface BizinfoResponse {
  list: BizinfoItem[]
  totalCount: number
  pageIndex: number
  pageUnit: number
}

const BIZINFO_BASE = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do'

function normalizeApiKey(raw: string | undefined): string {
  if (!raw) return ''
  return raw.trim().replace(/^['"]|['"]$/g, '')
}

function parseBizinfoJson(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    throw new Error(
      '[bizinfo] API가 HTML 오류 페이지를 반환했습니다. Vercel 등 클라우드 IP 차단·일시 장애일 수 있습니다. 로컬에서 `npm run sync`로 확인해 보세요.'
    )
  }
  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    throw new Error(`[bizinfo] JSON 파싱 실패: ${trimmed.slice(0, 120)}`)
  }
}

function extractList(json: Record<string, unknown>): BizinfoItem[] {
  const reqErr = json.reqErr
  if (typeof reqErr === 'string' && reqErr.trim()) {
    throw new Error(`[bizinfo] 인증 오류: ${reqErr.trim()}`)
  }

  if (Array.isArray(json.jsonArray)) {
    return json.jsonArray as BizinfoItem[]
  }
  const body = (json.body ?? json.result ?? json) as Record<string, unknown>
  const items = body.items as Record<string, unknown> | undefined
  if (items && Array.isArray(items.item)) {
    return items.item as BizinfoItem[]
  }
  if (Array.isArray(body.list)) {
    return body.list as BizinfoItem[]
  }
  return []
}

// 분야 → bizTpCd 매핑 (기업마당 공식 코드)
const FIELD_CODE_MAP: Record<string, string> = {
  창업: '01',
  금융: '02',
  기술: '03',
  인력: '04',
  수출: '05',
  내수: '06',
  경영: '07',
  기타: '08',
}

/** 관리 동기화에서 분야별 폴백 시 사용하는 분야 순서 */
export const BIZINFO_PRIMARY_SYNC_FIELDS = ['창업', '금융', '기술', '인력', '수출', '경영'] as const

export async function fetchBizinfo(options: {
  field?: string
  pageIndex?: number
  pageUnit?: number
  keyword?: string
}): Promise<BizinfoResponse> {
  const apiKey = normalizeApiKey(process.env.BIZINFO_API_KEY)
  if (!apiKey) {
    console.warn('[bizinfo] BIZINFO_API_KEY 미설정 — 빈 결과 반환')
    return { list: [], totalCount: 0, pageIndex: 1, pageUnit: 10 }
  }

  const { field, pageIndex = 1, pageUnit = 20, keyword } = options

  const params = new URLSearchParams({
    crtfcKey: apiKey,
    dataType: 'json',
    pageIndex: String(pageIndex),
    pageUnit: String(pageUnit),
  })

  if (field && FIELD_CODE_MAP[field]) {
    params.set('bizTpCd', FIELD_CODE_MAP[field])
  }
  if (keyword) {
    params.set('pbancNm', keyword)
  }

  const url = `${BIZINFO_BASE}?${params.toString()}`
  const maxAttempts = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent': `Mozilla/5.0 (compatible; ${SITE_BOT_USER_AGENT})`,
          Referer: 'https://www.bizinfo.go.kr/',
        },
        cache: 'no-store',
        signal: controller.signal,
      })

      const bodyText = await res.text()

      if (!res.ok) {
        const retryable = res.status >= 500 || res.status === 429
        lastError = new Error(
          `[bizinfo] API 오류: ${res.status} ${res.statusText}${bodyText ? ` | ${bodyText.slice(0, 120)}` : ''}`
        )
        if (retryable && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 400 * attempt))
          continue
        }
        throw lastError
      }

      const json = parseBizinfoJson(bodyText)
      const rawList = extractList(json)
      const firstItem = rawList[0]
      const totalCount = Number(json.totCnt ?? firstItem?.totCnt ?? rawList.length)

      return {
        list: rawList,
        totalCount,
        pageIndex,
        pageUnit,
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        lastError = new Error('[bizinfo] API 요청 시간 초과(20초)')
      } else if (e instanceof Error) {
        lastError = e
      } else {
        lastError = new Error('[bizinfo] 알 수 없는 오류')
      }
      const retryable =
        attempt < maxAttempts &&
        (/50[023]|429|시간 초과|HTML 오류/i.test(lastError.message) ||
          lastError.message.includes('fetch failed'))
      if (retryable) {
        await new Promise((r) => setTimeout(r, 400 * attempt))
        continue
      }
      throw lastError
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw lastError ?? new Error('[bizinfo] API 호출 실패')
}
