/** eligibility_text 등에서 업력·창업 연한 제약 추출 */
export type BusinessAgeConstraints = {
  /** 창업/업력 N년 미만·이하 → profile.age < N */
  maxYearsExclusive?: number
  /** 업력 N년 이상 → profile.age >= N */
  minYearsInclusive?: number
}

export function parseBusinessAgeConstraints(text: string | null | undefined): BusinessAgeConstraints | null {
  if (!text?.trim()) return null
  const t = text.replace(/\s+/g, ' ')
  const out: BusinessAgeConstraints = {}

  const maxPatterns = [
    /창업\s*(\d+)\s*년\s*미만/,
    /업력\s*(\d+)\s*년\s*미만/,
    /설립\s*(\d+)\s*년\s*미만/,
    /창업\s*(\d+)\s*년\s*이하/,
    /업력\s*(\d+)\s*년\s*이하/,
    /(\d+)\s*년\s*이내\s*(?:창업|설립|업력)?/,
  ]
  for (const re of maxPatterns) {
    const m = t.match(re)
    if (m) {
      out.maxYearsExclusive = Number(m[1])
      break
    }
  }

  const minPatterns = [/업력\s*(\d+)\s*년\s*이상/, /창업\s*(\d+)\s*년\s*이상/, /설립\s*(\d+)\s*년\s*이상/]
  for (const re of minPatterns) {
    const m = t.match(re)
    if (m) {
      out.minYearsInclusive = Number(m[1])
      break
    }
  }

  if (out.maxYearsExclusive == null && out.minYearsInclusive == null) return null
  return out
}

export function profileMatchesBusinessAgeConstraints(
  businessAgeYears: number | null | undefined,
  constraints: BusinessAgeConstraints | null
): boolean | null {
  if (!constraints) return null
  if (businessAgeYears == null || businessAgeYears === undefined) return null

  if (constraints.maxYearsExclusive != null && businessAgeYears >= constraints.maxYearsExclusive) {
    return false
  }
  if (constraints.minYearsInclusive != null && businessAgeYears < constraints.minYearsInclusive) {
    return false
  }
  return true
}
