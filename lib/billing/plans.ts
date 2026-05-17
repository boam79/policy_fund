export type PlanId = 'free' | 'starter' | 'pro'

export interface Plan {
  id: PlanId
  name: string
  price: number
  priceLabel: string
  description: string
  color: string
  highlight: boolean
  features: { label: string; included: boolean }[]
  limits: {
    diagnoses_per_month: number | null
    documents_per_month: number | null
    evaluations_per_month: number | null
    searches_per_month: number | null
    /** 로그인 사용자 일일 자연어 parse (null = 무제한) */
    parse_queries_per_day: number | null
    /** 로그인 사용자 일일 POST /api/search (null = 무제한) */
    search_requests_per_day: number | null
  }
}

/** 요금제 카드에 공통 순서로 노출 (플랜별 한도·포함 여부만 다름) */
export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '무료',
    description: '지원사업 탐색과 가벼운 적합 여부 확인에 맞춘 무료 플랜',
    color: 'gray',
    highlight: false,
    features: [
      { label: '공고 검색·키워드 필터 — 기관별 공고 조회 무제한', included: true },
      { label: '공고 상세·신청 링크·일정 등 핵심 정보 조회', included: true },
      { label: 'AI 자격·적합 판정 — 월 3회(요약형, 조건 스캔)', included: true },
      { label: '북마크·관심 공고 모음 — 저장 후 목록에서 관리', included: true },
      { label: '신청 서류 체크리스트 AI 생성 — 유료 플랜에서 이용', included: false },
      { label: '사업계획서 초안 AI 작성 — 심층 문서 초안', included: false },
      { label: '심사·적격 점수 예측 — 제출 전 리스크 점검', included: false },
      { label: '검색·진단 결과 CSV·XLSX보내기', included: false },
      { label: '마이페이지에서 월간 이용량·잔여 횟수 확인', included: true },
      { label: '웹(PC·모바일) 전 구간 이용', included: true },
    ],
    limits: {
      diagnoses_per_month: 3,
      documents_per_month: 0,
      evaluations_per_month: 0,
      searches_per_month: null,
      parse_queries_per_day: 20,
      search_requests_per_day: 50,
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9900,
    priceLabel: '월 9,900원',
    description: '상세 자격판정과 서류 준비까지 한 번에 다루는 입문 유료 플랜',
    color: 'blue',
    highlight: false,
    features: [
      { label: '공고 검색·키워드 필터 — 기관별 공고 조회 무제한', included: true },
      { label: '공고 상세·신청 링크·일정 등 핵심 정보 조회', included: true },
      { label: 'AI 자격·적합 판정 — 월 10회(상세, 조건·리스크 설명)', included: true },
      { label: '북마크·관심 공고 모음 — 저장 후 목록에서 관리', included: true },
      { label: '신청 서류 체크리스트 AI 생성 — 월 10건까지', included: true },
      { label: '사업계획서 초안 AI 작성 — 심층 문서 초안', included: false },
      { label: '심사·적격 점수 예측 — 제출 전 리스크 점검', included: false },
      { label: '검색·진단 결과 CSV·XLSX보내기', included: true },
      { label: '마이페이지에서 월간 이용량·잔여 횟수 확인', included: true },
      { label: '웹(PC·모바일) 전 구간 이용', included: true },
    ],
    limits: {
      diagnoses_per_month: 10,
      documents_per_month: 10,
      evaluations_per_month: 0,
      searches_per_month: null,
      parse_queries_per_day: null,
      search_requests_per_day: null,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29000,
    priceLabel: '월 29,000원',
    description: '계획서·심사 예측까지 포함해 제출 직전까지 커버하는 실전 플랜',
    color: 'indigo',
    highlight: true,
    features: [
      { label: '공고 검색·키워드 필터 — 기관별 공고 조회 무제한', included: true },
      { label: '공고 상세·신청 링크·일정 등 핵심 정보 조회', included: true },
      { label: 'AI 자격·적합 판정 — 월 30회(상세, 조건·리스크 설명)', included: true },
      { label: '북마크·관심 공고 모음 — 저장 후 목록에서 관리', included: true },
      { label: '신청 서류 체크리스트 AI 생성 — 월 30건까지', included: true },
      { label: '사업계획서 초안 AI 작성 — 체크리스트·타임라인과 공통 월 30건 한도', included: true },
      { label: '심사·적격 점수 예측 — 월 30회까지', included: true },
      { label: '검색·진단 결과 CSV·XLSX보내기', included: true },
      { label: '마이페이지에서 월간 이용량·잔여 횟수 확인', included: true },
      { label: '웹(PC·모바일) 전 구간 이용', included: true },
    ],
    limits: {
      diagnoses_per_month: 30,
      documents_per_month: 30,
      evaluations_per_month: 30,
      searches_per_month: null,
      parse_queries_per_day: null,
      search_requests_per_day: null,
    },
  },
]

/** URL·DB 레거시 `premium` → 최고 구독은 `pro`로 취급 */
export function normalizePlanId(raw: string | null | undefined): PlanId {
  const s = String(raw ?? '').trim()
  if (s === 'premium') return 'pro'
  if (s === 'free' || s === 'starter' || s === 'pro') return s
  return 'free'
}

export function getPlan(id: PlanId | string): Plan {
  return PLANS.find((p) => p.id === normalizePlanId(String(id))) ?? PLANS[0]
}

/** Starter 이상: 검색·진단 등 사용자 데이터 CSV/XLSX 보내기 */
export function planAllowsTabularExport(planId: PlanId): boolean {
  return planId === 'starter' || planId === 'pro'
}

/** Starter 이상: 엄격 검색(search_mode=strict, 조건 완화 없음) */
export function planAllowsStrictSearch(planId: PlanId): boolean {
  return planId === 'starter' || planId === 'pro'
}

export const UPGRADE_STRICT_SEARCH_MESSAGE =
  '엄격 검색은 Starter 이상 플랜에서 이용할 수 있습니다. 요금제 페이지에서 업그레이드해 주세요.'

export const UPGRADE_EXPORT_MESSAGE =
  'CSV·XLSX 보내기는 Starter 이상 플랜에서 이용할 수 있습니다.'
