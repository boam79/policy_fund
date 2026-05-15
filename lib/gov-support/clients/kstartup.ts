/**
 * K-Startup(k-startup.go.kr) 창업지원사업 공고 API 클라이언트
 * 환경변수 PUBLIC_DATA_SERVICE_KEY 필요 (data.go.kr 발급)
 * 데이터셋: 15125364
 * 엔드포인트: https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01
 */

export interface KStartupItem {
  // 신규(K-Startup 15125364) 필드
  pbanc_sn?: string
  biz_pbanc_nm?: string
  sprv_inst?: string
  pbanc_rcpt_bgng_dt?: string
  pbanc_rcpt_end_dt?: string
  supt_biz_clsfc?: string
  supt_regin?: string
  detl_pg_url?: string
  aply_trgt?: string
  aply_trgt_ctnt?: string
  id?: string

  // 구형/호환 필드
  pbancSn?: string
  pbancNm?: string
  supOrgNm?: string
  rcritBgnDe?: string
  rcritEndDe?: string
  suptBizClsfc?: string
  suptRegin?: string
  pbancUrl?: string
  tgEtrpsInfo?: string
  aplyMthd?: string
}

export interface KStartupResponse {
  list: KStartupItem[]
  totalCount: number
  pageNo: number
  numOfRows: number
}

function normalizePortalToken(raw: string): string {
  const token = raw.trim()
  if (!/%[0-9A-Fa-f]{2}/.test(token)) return token
  try {
    return decodeURIComponent(token)
  } catch {
    return token
  }
}

// K-Startup 공공데이터포털 API 엔드포인트 (공식)
const KSTARTUP_BASE =
  'https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01'

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
    serviceKey: normalizePortalToken(serviceKey),
    returnType: 'json',
    pageNo: String(pageNo),
    numOfRows: String(Math.min(numOfRows, 100)),
    rcrt_prgs_yn: rcrtPrgsYn,
  })

  if (suptBizClsfc) params.set('supt_biz_clsfc', suptBizClsfc)
  if (suptRegin) params.set('supt_regin', suptRegin)

  const url = `${KSTARTUP_BASE}?${params.toString()}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PolicyFundBot/1.0' },
      cache: 'no-store',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!res.ok) {
    throw new Error(`[kstartup] API 오류: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()

  // K-Startup 응답 구조: { data: [...], totalCount: number, ... }
  const rawList: KStartupItem[] = Array.isArray(json?.data) ? json.data : []
  const totalCount = Number(json?.totalCount ?? rawList.length)

  return {
    list: rawList,
    totalCount,
    pageNo,
    numOfRows,
  }
}
