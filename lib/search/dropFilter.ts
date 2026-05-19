export type DroppableFilterKey =
  | 'region'
  | 'city'
  | 'industry'
  | 'industry_match'
  | 'keyword'
  | 'support_purpose'
  | 'business_age_years'
  | 'employee_count'

export const DROPPABLE_FILTER_LABELS: Record<DroppableFilterKey, string> = {
  region: '지역',
  city: '시·군',
  industry: '업종',
  industry_match: '업종범위',
  keyword: '검색어',
  support_purpose: '지원목적',
  business_age_years: '업력',
  employee_count: '직원',
}
