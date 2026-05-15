import { SITE_BOT_USER_AGENT } from '@/lib/site-config'

/**
 * 중소벤처24(smes.go.kr) 지원사업 공고 API 클라이언트
 * 환경변수 SMES24_API_KEY (token) 필요
 * https://www.smes.go.kr/fnct/apiReqst/extPblancInfo
 */

export interface Smes24Item {
  // 신규(실제 응답) 필드
  pblancSeq?: number | string
  pblancNm?: string
  detailBsnsNm?: string
  sportInsttNm?: string
  pblancBgnDt?: string
  pblancEndDt?: string
  bizType?: string
  areaNm?: string
  sportTrget?: string
  pblancDtlUrl?: string
  reqstRcept?: string

  // 구형/호환 필드
  pbancId?: string          // 공고 ID
  pbancNm?: string          // 공고명
  jrsdInsttNm?: string      // 주관기관명
  reqstBgnDt?: string       // 신청시작일 (YYYYMMDD)
  reqstEndDt?: string       // 신청종료일 (YYYYMMDD)
  bizTpcdNm?: string        // 사업유형명
  pbancUrl?: string         // 공고 URL
  ereAtrgNm?: string        // 지원지역명
  tgtEntrpNm?: string       // 지원대상기업명
  excluTrgetNm?: string     // 제외대상명
  reqstDocuNm?: string      // 신청서류
  pbancSttsCd?: string      // 공고상태코드
}

export interface Smes24Response {
  list: Smes24Item[]
  totalCount: number
}

const SMES24_BASE = process.env.SMES24_API_BASE ??
  'https://www.smes.go.kr/fnct/apiReqst/extPblancInfo'

function normalizePortalToken(raw: string): string {
  const token = raw.trim()
  if (!/%[0-9A-Fa-f]{2}/.test(token)) return token
  try {
    return decodeURIComponent(token)
  } catch {
    return token
  }
}

/** YYYYMMDD 형식의 날짜 문자열 생성 */
function formatDateYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export async function fetchSmes24(options?: {
  strDt?: string   // 조회 시작일 YYYYMMDD (기본: 당월 1일)
  endDt?: string   // 조회 종료일 YYYYMMDD (기본: 오늘)
  pageNo?: number
  numOfRows?: number
}): Promise<Smes24Response> {
  const token = process.env.SMES24_API_KEY
  if (!token) {
    console.warn('[smes24] SMES24_API_KEY 미설정 — 빈 결과 반환')
    return { list: [], totalCount: 0 }
  }

  const now = new Date()
  const defaultEnd = formatDateYMD(now)
  const defaultStart = formatDateYMD(new Date(now.getFullYear(), now.getMonth(), 1))

  const strDt = options?.strDt ?? process.env.SMES24_DEFAULT_STRDT ?? defaultStart
  const endDt = options?.endDt ?? process.env.SMES24_DEFAULT_ENDDT ?? defaultEnd
  const pageNo = options?.pageNo ?? 1
  const numOfRows = options?.numOfRows ?? 100

  // token은 URLSearchParams에 넣기 전에 디코딩해 이중 인코딩을 방지
  const params = new URLSearchParams({
    token: normalizePortalToken(token),
    strDt,
    endDt,
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
  })
  const url = `${SMES24_BASE}?${params.toString()}`

  const request = async (requestUrl: string) =>
    fetch(requestUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': SITE_BOT_USER_AGENT,
      },
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    })

  let res: Response
  try {
    res = await request(url)
  } catch (e) {
    // 중소벤처24는 특정 기간 조합에서 간헐 타임아웃이 발생해, 최근 14일로 한 번 더 재시도한다.
    const retryStart = formatDateYMD(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000))
    const retryParams = new URLSearchParams({
      token: normalizePortalToken(token),
      strDt: retryStart,
      endDt: defaultEnd,
      pageNo: String(pageNo),
      numOfRows: String(numOfRows),
    })
    const retryUrl = `${SMES24_BASE}?${retryParams.toString()}`

    try {
      res = await request(retryUrl)
    } catch (retryError) {
      const msg = retryError instanceof Error ? retryError.message : (e instanceof Error ? e.message : '알 수 없는 오류')
      throw new Error(`[smes24] 연결 실패 (서버 IP 등록 확인 필요): ${msg}`)
    }
  }

  if (!res.ok) {
    throw new Error(`[smes24] API 오류: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()

  // 중소벤처24 응답 구조 파싱 (다양한 wrapping 대응)
  const rawList: Smes24Item[] = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.list)
    ? json.list
    : Array.isArray(json?.body?.list)
    ? json.body.list
    : Array.isArray(json)
    ? json
    : []

  const totalCount = Number(
    json?.totalCount ?? json?.total ?? json?.cnt ?? rawList.length
  )

  return { list: rawList, totalCount }
}
