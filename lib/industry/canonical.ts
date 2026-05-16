/**
 * 검색 필터·진단 UI와 동일한 업종 표준 라벨
 * (app/search/page.tsx 의 INDUSTRIES 와 동기화)
 */
export const CANONICAL_INDUSTRIES = [
  '제조업',
  '서비스업',
  'IT/소프트웨어',
  '유통/도소매',
  '음식/외식',
  '건설업',
  '기타',
] as const

const CANONICAL_SET = new Set<string>(CANONICAL_INDUSTRIES)

/** 영문·약어 (parseNaturalLanguage INDUSTRY_NORMALIZE_MAP 호환) */
const EN_ALIAS: Record<string, (typeof CANONICAL_INDUSTRIES)[number]> = {
  manufacturing: '제조업',
  manufacturer: '제조업',
  service: '서비스업',
  services: '서비스업',
  it: 'IT/소프트웨어',
  software: 'IT/소프트웨어',
  tech: 'IT/소프트웨어',
  technology: 'IT/소프트웨어',
  retail: '유통/도소매',
  distribution: '유통/도소매',
  food: '음식/외식',
  restaurant: '음식/외식',
  construction: '건설업',
  agriculture: '기타',
  fishery: '기타',
}

/**
 * 자연어·LLM 출력·URL 파라미터를 검색 필터용 표준 업종 문자열로 맞춤.
 * 예: "소프트웨어" → "IT/소프트웨어" (드롭다운 value 일치, DB ilike 매칭률 개선)
 */
export function toCanonicalIndustry(raw: string): string {
  const t = raw.trim()
  if (!t) return t
  if (CANONICAL_SET.has(t)) return t

  if (t.includes('응용소프트웨어') || /소프트웨어/i.test(t)) return 'IT/소프트웨어'
  if (/정보\s*통신/.test(t) || /^ict$/i.test(t)) return 'IT/소프트웨어'

  const lower = t.toLowerCase()
  const en = EN_ALIAS[lower]
  if (en) return en

  if (t.includes('제조')) return '제조업'
  if (t.includes('도소매') || t.includes('유통')) return '유통/도소매'
  if (t.includes('외식') || t.includes('음식') || t.includes('요식')) return '음식/외식'
  if (t.includes('건설')) return '건설업'
  if (t.includes('서비스')) return '서비스업'

  return t
}
