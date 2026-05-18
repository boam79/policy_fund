import type { ParsedConditions } from '@/lib/query/parseNaturalLanguage'

/** LLM이 영문으로 반환하는 시·도명 → 검색·UI용 한글 */
const ENGLISH_REGION: Record<string, string> = {
  seoul: '서울',
  busan: '부산',
  incheon: '인천',
  daegu: '대구',
  gwangju: '광주',
  daejeon: '대전',
  ulsan: '울산',
  sejong: '세종',
  gyeonggi: '경기',
  gangwon: '강원',
  'north chungcheong': '충북',
  'south chungcheong': '충남',
  'north jeolla': '전북',
  'south jeolla': '전남',
  'north gyeongsang': '경북',
  'south gyeongsang': '경남',
  jeju: '제주',
}

/** LLM 영문 지원 목적 → 한글 키워드(검색·요약) */
const ENGLISH_PURPOSE: Record<string, string> = {
  'operating funds': '운전자금',
  'operating fund': '운전자금',
  'operating capital': '운전자금',
  'working capital': '운전자금',
  'working funds': '운전자금',
  'facility funds': '시설자금',
  'facility fund': '시설자금',
  marketing: '마케팅',
  export: '수출',
  employment: '고용',
  hiring: '고용',
  'research and development': '연구개발',
  commercialization: '사업화',
  startup: '창업',
}

/** 한글 동의어 → 검색에 쓰는 표준 목적어 */
const KOREAN_PURPOSE_ALIASES: Record<string, string> = {
  운영자금: '운전자금',
}

function normKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * parse 결과의 region·city·support_purpose를 한글·필터 호환 값으로 보정.
 * (LLM이 Seoul / Operating funds 등을 넣는 경우 대비)
 */
export function canonicalizeParsedConditions(conditions: ParsedConditions): ParsedConditions {
  const out: ParsedConditions = { ...conditions }

  if (out.region?.value) {
    const raw = String(out.region.value).trim()
    const mapped = ENGLISH_REGION[normKey(raw)]
    if (mapped) {
      out.region = { ...out.region, value: mapped }
    }
  }

  if (out.city?.value) {
    const raw = String(out.city.value).trim()
    const asRegion = ENGLISH_REGION[normKey(raw)]
    if (asRegion) {
      if (!out.region) {
        out.region = {
          value: asRegion,
          confidence: out.city.confidence,
          source_text: out.city.source_text ?? raw,
        }
      }
      delete out.city
    }
  }

  if (out.support_purpose?.value) {
    const raw = String(out.support_purpose.value).trim()
    const key = normKey(raw)
    let mapped =
      ENGLISH_PURPOSE[key] ??
      KOREAN_PURPOSE_ALIASES[raw] ??
      (key.includes('operat') ? '운전자금' : undefined) ??
      (key.includes('facilit') ? '시설자금' : undefined)
    if (mapped) {
      out.support_purpose = { ...out.support_purpose, value: mapped }
    }
  }

  return out
}
