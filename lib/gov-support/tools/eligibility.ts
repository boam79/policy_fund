/**
 * 룰 기반 자격판정 엔진
 * PRD §21.5 — LLM은 설명 생성만, 판정 결과는 이 룰 엔진이 결정
 *
 * 판정 상태값:
 *  - likely_eligible   : 주요 조건 충족
 *  - review_needed     : 일부 조건 불명확 (추가 검토 필요)
 *  - likely_ineligible : 명확한 결격 사유
 *  - unknown           : 판단 불가 (정보 부족)
 */

export type EligibilityStatus =
  | 'likely_eligible'
  | 'review_needed'
  | 'likely_ineligible'
  | 'unknown'

export interface CompanyProfile {
  region?: string | null
  city?: string | null
  industry?: string | null
  business_age_years?: number | null
  employee_count?: number | null
  annual_revenue_krw?: number | null
  credit_score?: number | null
  tax_arrears?: boolean | null
  desired_amount_krw?: number | null
  support_purpose?: string | null
  business_type?: string | null
  startup_stage?: string | null
}

export interface ProgramConditions {
  title: string
  region?: string | null
  industry?: string | null
  eligibility_text?: string | null
  exclusion_text?: string | null
  support_type?: string | null
  support_amount_min_krw?: number | null
  support_amount_max_krw?: number | null
  target_business_type?: string | null
}

export interface EligibilityRule {
  name: string
  check: (profile: CompanyProfile, program: ProgramConditions) => boolean | null
  failStatus: EligibilityStatus
  reason: string
}

export interface EligibilityResult {
  status: EligibilityStatus
  score: number        // 0~100 충족도
  passed: string[]     // 충족 조건
  failed: string[]     // 미충족/불명확 조건
  unknown: string[]    // 정보 없어 판단 불가
}

// ─── 룰 정의 ──────────────────────────────────────────────────────────────

const RULES: EligibilityRule[] = [
  {
    name: '세금 체납',
    check: (p) => {
      if (p.tax_arrears === null || p.tax_arrears === undefined) return null
      return !p.tax_arrears
    },
    failStatus: 'likely_ineligible',
    reason: '세금 체납 이력이 있으면 대부분의 지원사업 신청 불가',
  },
  {
    name: '지역 매칭',
    check: (p, prog) => {
      if (!prog.region) return null
      if (!p.region) return null
      const progRegion = prog.region.toLowerCase()
      if (progRegion.includes('전국')) return true
      const profRegion = (p.region + (p.city ?? '')).toLowerCase()
      return progRegion.split(/[,·\s]+/).some((r) => profRegion.includes(r.trim().slice(0, 2)))
    },
    failStatus: 'likely_ineligible',
    reason: '지원 지역이 기업 소재지와 불일치',
  },
  {
    name: '업종 매칭',
    check: (p, prog) => {
      if (!prog.industry && !prog.support_type && !prog.eligibility_text) return null
      if (!p.industry) return null
      const targetText = [prog.industry, prog.support_type, prog.eligibility_text]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const keywords = p.industry.toLowerCase().split(/[\s,]+/)
      // 제조업, 서비스업 등 대분류 키워드 포함 시 pass
      const broadMatch = ['전체', '전 업종', '모든 업종', '제한없음'].some((k) =>
        targetText.includes(k)
      )
      if (broadMatch) return true
      return keywords.some((k) => k.length >= 2 && targetText.includes(k))
    },
    failStatus: 'review_needed',
    reason: '업종 조건 불일치 또는 확인 필요',
  },
  {
    name: '업력 조건',
    check: (p, prog) => {
      if (!prog.eligibility_text) return null
      if (p.business_age_years === null || p.business_age_years === undefined) return null
      const text = prog.eligibility_text.toLowerCase()
      // "창업 7년 미만" 패턴
      const match7 = text.match(/창업\s*(\d+)년\s*미만/)
      if (match7) return p.business_age_years < Number(match7[1])
      // "업력 3년 이상" 패턴
      const matchMin = text.match(/업력\s*(\d+)년\s*이상/)
      if (matchMin) return p.business_age_years >= Number(matchMin[1])
      return null
    },
    failStatus: 'likely_ineligible',
    reason: '업력 조건 불충족',
  },
  {
    name: '소기업/중소기업 여부',
    check: (p, prog) => {
      if (!prog.eligibility_text) return null
      const text = prog.eligibility_text
      // 소상공인 조건
      if (text.includes('소상공인') && p.employee_count !== null && p.employee_count !== undefined) {
        return p.employee_count <= 10
      }
      // 중소기업 조건 (직원 300명 이하 간략 기준)
      if (text.includes('중소기업') && p.employee_count !== null && p.employee_count !== undefined) {
        return p.employee_count <= 300
      }
      return null
    },
    failStatus: 'review_needed',
    reason: '기업 규모 조건 확인 필요',
  },
]

// ─── 판정 함수 ─────────────────────────────────────────────────────────────

export function checkEligibility(
  profile: CompanyProfile,
  program: ProgramConditions
): EligibilityResult {
  const passed: string[] = []
  const failed: string[] = []
  const unknownList: string[] = []

  let hasIneligible = false
  let hasReviewNeeded = false

  for (const rule of RULES) {
    const result = rule.check(profile, program)
    if (result === null) {
      unknownList.push(rule.name)
    } else if (result === true) {
      passed.push(rule.name)
    } else {
      failed.push(`${rule.name}: ${rule.reason}`)
      if (rule.failStatus === 'likely_ineligible') hasIneligible = true
      if (rule.failStatus === 'review_needed') hasReviewNeeded = true
    }
  }

  let status: EligibilityStatus
  if (hasIneligible) {
    status = 'likely_ineligible'
  } else if (hasReviewNeeded) {
    status = 'review_needed'
  } else if (passed.length === 0 && unknownList.length > 0) {
    status = 'unknown'
  } else if (passed.length > 0 && failed.length === 0) {
    status = 'likely_eligible'
  } else {
    status = 'review_needed'
  }

  const total = passed.length + failed.length
  const score = total === 0 ? 50 : Math.round((passed.length / total) * 100)

  return { status, score, passed, failed, unknown: unknownList }
}

/** 카드·툴팁용 한 줄 사유 (failed 우선, 없으면 unknown) */
export function eligibilityPrimaryReason(result: EligibilityResult): string | null {
  if (result.failed.length > 0) {
    const first = result.failed[0]
    const colon = first.indexOf(': ')
    return colon >= 0 ? first.slice(colon + 2).trim() : first
  }
  if (result.unknown.length > 0) {
    return `${result.unknown[0]} 항목은 공고·프로필 정보가 부족해 추가 확인이 필요합니다`
  }
  return null
}

/** 자격판정 상태 → 한국어 레이블 */
export function eligibilityLabel(status: EligibilityStatus): string {
  return {
    likely_eligible: '신청 가능',
    review_needed: '검토 필요',
    likely_ineligible: '신청 어려움',
    unknown: '정보 부족',
  }[status]
}

/** 자격판정 상태 → Tailwind 색상 클래스 */
export function eligibilityColor(status: EligibilityStatus): string {
  return {
    likely_eligible: 'bg-green-100 text-green-800',
    review_needed: 'bg-yellow-100 text-yellow-800',
    likely_ineligible: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-600',
  }[status]
}
