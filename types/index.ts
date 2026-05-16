/**
 * 지원둥지 — 공통 TypeScript 타입 정의
 * DB 타입은 types/database.types.ts 자동 생성본을 참조한다.
 */

// ============================================================
// 표준 필드명 (PRD §21.2 기준) — 자연어 추출·API·DB 간 통일
// ============================================================
export interface BusinessConditions {
  region?: string             // 지역 (시도 단위)
  city?: string               // 시군구
  industry?: string           // 업종
  business_age_years?: number // 업력 (연 단위)
  employee_count?: number     // 직원 수
  annual_revenue_krw?: number // 연 매출 (KRW 정수)
  credit_score?: number       // 신용점수
  tax_arrears?: boolean       // 세금 체납 여부
  desired_amount_krw?: number // 희망 지원 금액 (KRW 정수)
  support_purpose?: string    // 지원 목적
  business_type?: string      // 사업 형태 (법인/개인 등)
  startup_stage?: string      // 창업 단계
  certifications?: string[]   // 인증 목록
}

// ============================================================
// 자격판정 상태값 (PRD §21.5 기준)
// ============================================================
export type EligibilityStatus =
  | 'likely_eligible'
  | 'review_needed'
  | 'likely_ineligible'
  | 'unknown'

// ============================================================
// 공고 상태값 (PRD §21.3 기준)
// ============================================================
export type ProgramStatus =
  | 'active'
  | 'closing_soon'
  | 'closed'
  | 'archived'
  | 'hidden'
  | 'error'
  | 'duplicate_suspected'
  | 'deleted_candidate'
  | 'unknown'

export type ProgramVisibility = 'visible' | 'hidden' | 'excluded_from_recommendation'

export type ProgramSource = 'bizinfo' | 'kstartup' | 'smes24'

// ============================================================
// 데이터 운영 모드 (PRD §22.3)
// ============================================================
export type DataMode = 'api_minimal_cache' | 'db_centric'

// ============================================================
// 사용자 역할 / 플랜
// ============================================================
export type UserRole = 'user' | 'consultant' | 'admin'

export type PlanCode =
  | 'free'
  | 'starter'
  | 'pro'
  | 'consultant_basic'
  | 'consultant_pro'
  | 'agency'

// ============================================================
// 룰 엔진 조건 타입 (PRD §21.5.1)
// ============================================================
export type RuleOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'in'
  | 'not_in'
  | 'contains'

export type RuleType =
  | 'required_condition'
  | 'exclusion_condition'
  | 'preference_condition'

export interface EligibilityRule {
  field: keyof BusinessConditions
  operator: RuleOperator
  value: unknown
  required: boolean
  rule_type: RuleType
  source_clause: string
}

// ============================================================
// API 응답 공통 래퍼
// ============================================================
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ============================================================
// 금액 포맷터 (KRW 정수 → 표시 문자열)
// ============================================================
export function formatKRW(amount: number): string {
  if (amount >= 100_000_000) {
    const eok = amount / 100_000_000
    return `${eok % 1 === 0 ? eok : eok.toFixed(1)}억원`
  }
  if (amount >= 10_000) {
    const man = amount / 10_000
    return `${man % 1 === 0 ? man : man.toFixed(0)}만원`
  }
  return `${amount.toLocaleString('ko-KR')}원`
}
