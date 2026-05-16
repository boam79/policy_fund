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
  }
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '무료',
    description: '처음 시작하는 기업을 위한 기본 플랜',
    color: 'gray',
    highlight: false,
    features: [
      { label: '공고 검색 무제한', included: true },
      { label: '빠른 AI 진단 월 3회', included: true },
      { label: '공고 북마크', included: true },
      { label: '상세 자격판정', included: false },
      { label: '서류 체크리스트', included: false },
      { label: '사업계획서 초안', included: false },
      { label: '심사 점수 예측', included: false },
      { label: 'CSV/XLSX보내기', included: false },
    ],
    limits: { diagnoses_per_month: 3, documents_per_month: 0, evaluations_per_month: 0, searches_per_month: null },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9900,
    priceLabel: '월 9,900원',
    description: '자격판정·서류 준비에 집중하는 플랜',
    color: 'blue',
    highlight: false,
    features: [
      { label: '공고 검색 무제한', included: true },
      { label: '상세 자격판정 월 10회', included: true },
      { label: '서류 체크리스트 월 10건', included: true },
      { label: '공고 북마크', included: true },
      { label: '사업계획서 초안', included: false },
      { label: '심사 점수 예측', included: false },
      { label: 'CSV/XLSX보내기', included: true },
      { label: '우선 AI 생성', included: false },
    ],
    limits: { diagnoses_per_month: 10, documents_per_month: 10, evaluations_per_month: 0, searches_per_month: null },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29000,
    priceLabel: '월 29,000원',
    description: '사업계획서까지 완성하는 실전 플랜',
    color: 'indigo',
    highlight: true,
    features: [
      { label: '공고 검색 무제한', included: true },
      { label: '상세 자격판정 월 30회', included: true },
      { label: '서류 체크리스트 무제한', included: true },
      { label: '사업계획서 초안 월 3건', included: true },
      { label: '심사 점수 예측 월 30회', included: true },
      { label: 'CSV/XLSX보내기', included: true },
      { label: '공고 북마크 무제한', included: true },
      { label: '우선 AI 생성', included: false },
    ],
    limits: { diagnoses_per_month: 30, documents_per_month: 3, evaluations_per_month: 30, searches_per_month: null },
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
