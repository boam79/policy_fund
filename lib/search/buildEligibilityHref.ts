const PROFILE_KEYS = [
  'region',
  'city',
  'industry',
  'business_age_years',
  'employee_count',
  'tax_arrears',
  'support_purpose',
] as const

/** 공고 상세 → 자격판정 링크 (검색 return 쿼리·프로필 파라미터 전달) */
export function buildEligibilityHref(programId: string, returnQuery?: string | null): string {
  const params = new URLSearchParams()
  params.set('program_id', programId)

  if (returnQuery) {
    const q = returnQuery.startsWith('?') ? returnQuery.slice(1) : returnQuery
    const fromReturn = new URLSearchParams(q)
    for (const key of PROFILE_KEYS) {
      const v = fromReturn.get(key)
      if (v) params.set(key, v)
    }
    if (fromReturn.toString()) {
      params.set('return', returnQuery.startsWith('?') ? returnQuery : `?${returnQuery}`)
    }
  }

  return `/eligibility?${params.toString()}`
}
