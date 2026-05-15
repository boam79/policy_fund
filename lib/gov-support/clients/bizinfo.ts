/**
 * 기업마당(bizinfo.go.kr) 공고 API 클라이언트
 * 환경변수 BIZINFO_API_KEY 필요
 * https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do
 */

export interface BizinfoItem {
  pblancId: string       // 공고 ID
  pblancNm: string       // 공고명
  jurMnofNm: string      // 주관기관명
  rceptBgnde: string     // 접수시작일 (YYYYMMDD)
  rceptEndde: string     // 접수종료일 (YYYYMMDD)
  bizTpNm: string        // 지원분야명
  pblancUrl: string      // 공고 URL
  tgMbrCndCont?: string  // 지원대상
  sprtExclCndCont?: string // 제외대상
  rqDocuCont?: string    // 필요서류
  areaCd?: string        // 지역코드
  sprtCnts?: string      // 지원내용
}

export interface BizinfoResponse {
  list: BizinfoItem[]
  totalCount: number
  pageIndex: number
  pageUnit: number
}

const BIZINFO_BASE = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do'

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

export async function fetchBizinfo(options: {
  field?: string
  pageIndex?: number
  pageUnit?: number
  keyword?: string
}): Promise<BizinfoResponse> {
  const apiKey = process.env.BIZINFO_API_KEY
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

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 }, // 1시간 캐시
  })

  if (!res.ok) {
    throw new Error(`[bizinfo] API 오류: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()

  // 기업마당 응답 구조: body.items.item 또는 result.list
  const body = json?.body ?? json?.result ?? json
  const rawList: BizinfoItem[] = Array.isArray(body?.items?.item)
    ? body.items.item
    : Array.isArray(body?.list)
    ? body.list
    : []

  const totalCount =
    Number(body?.totalCount ?? body?.pblancTotCnt ?? rawList.length)

  return {
    list: rawList,
    totalCount,
    pageIndex,
    pageUnit,
  }
}
