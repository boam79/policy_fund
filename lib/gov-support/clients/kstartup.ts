/**
 * K-Startup(k-startup.go.kr) 창업지원사업 공고 API 클라이언트
 * 환경변수 PUBLIC_DATA_SERVICE_KEY 필요 (data.go.kr 발급)
 * https://www.k-startup.go.kr/bizhubs/api/v1/pbancs
 */

export interface KStartupItem {
  pbancSn: string        // 공고 일련번호
  pbancNm: string        // 공고명
  supOrgNm: string       // 주관기관명
  rcritBgnDe: string     // 모집시작일 (YYYYMMDD)
  rcritEndDe: string     // 모집종료일 (YYYYMMDD)
  suptBizClsfc: string   // 지원사업분류
  suptRegin: string      // 지원지역
  pbancUrl: string       // 공고 URL
  tgEtrpsInfo?: string   // 지원대상기업정보
  aplyMthd?: string      // 신청방법
}

export interface KStartupResponse {
  list: KStartupItem[]
  totalCount: number
  pageNo: number
  numOfRows: number
}

// K-Startup 공공데이터포털 API 엔드포인트
const KSTARTUP_BASE =
  'https://apis.data.go.kr/B553077/startup/SelectStartupPbancList'

export async function fetchKStartup(options: {
  suptBizClsfc?: string
  suptRegin?: string
  rcrtPrgsYn?: 'Y' | 'N'
  pageNo?: number
  numOfRows?: number
}): Promise<KStartupResponse> {
  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY
  if (!serviceKey) {
    console.warn('[kstartup] PUBLIC_DATA_SERVICE_KEY 미설정 — 빈 결과 반환')
    return { list: [], totalCount: 0, pageNo: 1, numOfRows: 10 }
  }

  const {
    suptBizClsfc,
    suptRegin,
    rcrtPrgsYn = 'Y',
    pageNo = 1,
    numOfRows = 20,
  } = options

  const params = new URLSearchParams({
    serviceKey,
    type: 'json',
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
    rcrt_prgs_yn: rcrtPrgsYn,
  })

  if (suptBizClsfc) params.set('supt_biz_clsfc', suptBizClsfc)
  if (suptRegin) params.set('supt_regin', suptRegin)

  const url = `${KSTARTUP_BASE}?${params.toString()}`

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`[kstartup] API 오류: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()

  // K-Startup 응답 구조 처리 (공공데이터포털 표준)
  const body = json?.response?.body ?? json?.body ?? json
  const rawItems = body?.items?.item
  const rawList: KStartupItem[] = Array.isArray(rawItems)
    ? rawItems
    : rawItems
    ? [rawItems]
    : []

  const totalCount = Number(body?.totalCount ?? rawList.length)

  return {
    list: rawList,
    totalCount,
    pageNo,
    numOfRows,
  }
}
