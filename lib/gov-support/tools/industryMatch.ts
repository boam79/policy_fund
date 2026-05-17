import { toCanonicalIndustry } from '@/lib/industry/canonical'

export type IndustryMatchMode = 'match' | 'similar' | 'any'

export function normalizeIndustryMatchMode(raw: unknown): IndustryMatchMode {
  if (raw === 'similar' || raw === 'any') return raw
  return 'match'
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/,/g, ' ').trim()
}

/** 유사 업종 — 태그·제목·지원유형만 (공고문 전체 ilike 제외) */
export function buildIndustrySimilarPredicateOr(rawIndustry: string): string {
  const canonical = toCanonicalIndustry(rawIndustry)
  const t = sanitizeSearchTerm(canonical)
  const tagFilter = `industry_tags.cs.{${t}}`
  return [tagFilter, `title.ilike.%${t}%`, `support_type.ilike.%${t}%`].join(',')
}

export const INDUSTRY_MATCH_LABELS: Record<IndustryMatchMode, string> = {
  match: '업종 일치',
  similar: '업종 유사',
  any: '업종 전체',
}
