/** PostgREST `.or()` 구문에 콤마가 들어가면 깨지므로 제거 */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/,/g, ' ').trim()
}

/** 검색어를 AND 매칭용 토큰으로 분리 (예: `광명시 ESG` → `광명시`, `ESG`) */
export function tokenizeSearchQuery(raw: string): string[] {
  const seen = new Set<string>()
  const tokens: string[] = []
  for (const part of raw.split(/\s+/)) {
    const t = sanitizeSearchTerm(part)
    if (t.length < 2) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tokens.push(t)
  }
  return tokens
}

/** 키워드·지원목적·업종 등 — AND로 적용할 검색 토큰 목록 */
export function collectSearchTextTerms(params: {
  industry?: string
  support_purpose?: string | null
  keyword?: string | null
}): string[] {
  const seen = new Set<string>()
  const terms: string[] = []

  const push = (raw: string | null | undefined) => {
    const t = raw?.trim()
    if (!t) return
    const tokens = t.includes(' ') ? tokenizeSearchQuery(t) : [sanitizeSearchTerm(t)]
    for (const token of tokens) {
      if (token.length < 2) continue
      const key = token.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      terms.push(token)
    }
  }

  push(params.support_purpose)
  push(params.keyword)
  // industry는 별도 필터 — 키워드 검색과 중복 시 제외
  return terms
}

/** 제목·기관·URL·외부ID·raw JSON 등 텍스트 검색 (`SUPPORT_PROGRAMS_SEARCH_TEXT=1` 시 search_text 컬럼 포함) */
export function buildTextSearchPredicateOr(term: string): string {
  const t = sanitizeSearchTerm(term)
  const fields = [
    `industry.ilike.%${t}%`,
    `title.ilike.%${t}%`,
    `organization.ilike.%${t}%`,
    `support_type.ilike.%${t}%`,
    `eligibility_text.ilike.%${t}%`,
    `region.ilike.%${t}%`,
    `external_id.ilike.%${t}%`,
    `application_url.ilike.%${t}%`,
    `raw_content.ilike.%${t}%`,
  ]
  if (process.env.SUPPORT_PROGRAMS_SEARCH_TEXT === '1') {
    fields.splice(fields.length - 1, 0, `search_text.ilike.%${t}%`)
  }
  return fields.join(',')
}
