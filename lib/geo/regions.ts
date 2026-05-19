/** 시·도 필터·프로필 공통 옵션 (전국 제외) */
export const PROVINCE_OPTIONS = [
  '서울',
  '경기',
  '인천',
  '부산',
  '대구',
  '광주',
  '대전',
  '울산',
  '세종',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
] as const

/** 검색 필터용 — 전국 포함 */
export const SEARCH_REGION_OPTIONS = ['전국', ...PROVINCE_OPTIONS] as const

export const REGION_NORMALIZE_MAP: Record<string, string> = {
  서울특별시: '서울',
  경기도: '경기',
  인천광역시: '인천',
  부산광역시: '부산',
  대구광역시: '대구',
  광주광역시: '광주',
  대전광역시: '대전',
  울산광역시: '울산',
  세종특별자치시: '세종',
  강원도: '강원',
  강원특별자치도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전라북도: '전북',
  전북특별자치도: '전북',
  전라남도: '전남',
  경상북도: '경북',
  경상남도: '경남',
  제주도: '제주',
  제주특별자치도: '제주',
}

/** URL·필터용 지역 정규화. 빈 값은 빈 문자열 */
export function normalizeRegionForFilter(value: unknown): string {
  if (typeof value !== 'string') return ''
  const raw = value.trim()
  if (!raw) return ''
  return REGION_NORMALIZE_MAP[raw] ?? raw
}

/** 진단·프로필 draft — 빈 값은 null */
export function normalizeRegionOrNull(value: unknown): string | null {
  const n = normalizeRegionForFilter(value)
  return n || null
}
