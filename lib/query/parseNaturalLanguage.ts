/**
 * 자연어 → BusinessConditions 추출 엔진
 * Context7 패턴: geminiJSON + responseSchema (Type.OBJECT)
 *
 * PRD §21.2 표준 필드명 기준
 * 금액 단위: KRW 정수 (원 단위)
 * 확신도(confidence): 0~1 (낮으면 조건 확인 카드에서 사용자 확인 요청)
 */

import { geminiJSON, Type } from '@/lib/llm/gemini'
import type { Schema } from '@google/genai'
import type { BusinessConditions } from '@/types'
import { toCanonicalIndustry } from '@/lib/industry/canonical'

export interface ExtractedCondition<T = unknown> {
  value: T
  confidence: number      // 0~1
  source_text?: string    // 원문 근거 문장
}

export interface ParsedConditions {
  region?: ExtractedCondition<string>
  city?: ExtractedCondition<string>
  industry?: ExtractedCondition<string>
  business_age_years?: ExtractedCondition<number>
  employee_count?: ExtractedCondition<number>
  annual_revenue_krw?: ExtractedCondition<number>
  desired_amount_krw?: ExtractedCondition<number>
  support_purpose?: ExtractedCondition<string>
  business_type?: ExtractedCondition<string>
  startup_stage?: ExtractedCondition<string>
  certifications?: ExtractedCondition<string[]>
  credit_score?: ExtractedCondition<number>
  tax_arrears?: ExtractedCondition<boolean>
}

export interface ParseNLResult {
  conditions: ParsedConditions
  summary: string             // 1~2문장 요약 (한국어)
  missing_important: string[] // 중요하지만 누락된 조건 목록
  raw_query: string
}

const REGION_ALIASES: Record<string, string[]> = {
  서울: ['서울', '서울특별시'],
  경기: ['경기', '경기도'],
  인천: ['인천', '인천광역시'],
  부산: ['부산', '부산광역시'],
  대구: ['대구', '대구광역시'],
  광주: ['광주', '광주광역시'],
  대전: ['대전', '대전광역시'],
  울산: ['울산', '울산광역시'],
  세종: ['세종', '세종특별자치시'],
  강원: ['강원', '강원도', '강원특별자치도'],
  충북: ['충북', '충청북도'],
  충남: ['충남', '충청남도'],
  전북: ['전북', '전라북도', '전북특별자치도'],
  전남: ['전남', '전라남도'],
  경북: ['경북', '경상북도'],
  경남: ['경남', '경상남도'],
  제주: ['제주', '제주도', '제주특별자치도'],
}

// 지역 alias → canonical 역방향 조회 맵
const REGION_CANONICAL: Record<string, string> = {}
for (const [canonical, aliases] of Object.entries(REGION_ALIASES)) {
  for (const alias of aliases) {
    REGION_CANONICAL[alias] = canonical
  }
}
const VALID_REGIONS_SET = new Set(Object.keys(REGION_ALIASES))

// 숫자 필드별 유효 범위 (PRD §21.2 기준)
const NUMERIC_FIELD_RANGES: Record<string, { min: number; max: number }> = {
  business_age_years: { min: 0, max: 100 },
  employee_count: { min: 1, max: 50000 },
  annual_revenue_krw: { min: 0, max: 10_000_000_000_000 },  // 10조
  desired_amount_krw: { min: 0, max: 10_000_000_000_000 },
  credit_score: { min: 0, max: 1000 },
}

/**
 * Hybrid Confidence: LLM 결과에 도메인 검증 레이어 적용
 * - region: 17개 시도 목록에 없으면 null → missing_important 이동
 * - 숫자 필드: 비현실적 범위이면 null → missing_important 이동
 * - KRW 금액: 정수로 강제 변환 (PRD §16.3)
 * - 검증 후 conditions 에 값이 있으면 해당 키는 missing_important 에서 제거 (LLM 불일치 보정)
 */
function pruneMissingImportant(
  conditions: ParsedConditions,
  missing: string[]
): string[] {
  return missing.filter((key) => {
    const k = key as keyof ParsedConditions
    const cond = conditions[k] as ExtractedCondition<unknown> | undefined
    if (!cond) return true
    const v = cond.value
    if (v === undefined || v === null) return true
    if (typeof v === 'string' && v.trim() === '') return true
    return false
  })
}

function domainValidateConditions(
  conditions: ParsedConditions,
  missingImportant: string[]
): { conditions: ParsedConditions; missing_important: string[] } {
  const validated: ParsedConditions = { ...conditions }
  const extraMissing: string[] = []

  // region 검증
  if (validated.region) {
    const raw = String(validated.region.value).trim()
    const canonical = REGION_CANONICAL[raw] ?? (VALID_REGIONS_SET.has(raw) ? raw : null)
    if (!canonical) {
      delete validated.region
      if (!missingImportant.includes('region')) extraMissing.push('region')
    } else {
      validated.region = {
        ...validated.region,
        value: canonical,
        confidence: Math.min(1, validated.region.confidence + 0.1),
      }
    }
  }

  // 숫자 필드 범위 검증 + KRW 정수 변환 (LLM이 문자열 숫자를 줄 때 대비)
  for (const [key, range] of Object.entries(NUMERIC_FIELD_RANGES)) {
    const k = key as keyof ParsedConditions
    let cond = validated[k] as ExtractedCondition<number> | undefined
    if (!cond) continue

    let val: number
    if (typeof cond.value === 'string') {
      val = Number(String(cond.value).replace(/,/g, ''))
      if (!Number.isFinite(val)) {
        delete validated[k]
        if (!missingImportant.includes(key)) extraMissing.push(key)
        continue
      }
      const coerced: ExtractedCondition<number> = { ...cond, value: val }
      ;(validated as Record<string, ExtractedCondition<unknown> | undefined>)[key] = coerced
      cond = coerced
    }
    val = Number((validated[k] as ExtractedCondition<number>).value)
    if (!Number.isFinite(val) || val < range.min || val > range.max) {
      delete validated[k]
      if (!missingImportant.includes(key)) extraMissing.push(key)
    } else if (key === 'annual_revenue_krw' || key === 'desired_amount_krw') {
      ;(validated[k] as ExtractedCondition<number>) = { ...cond, value: Math.round(val) }
    }
  }

  const mergedMissing = [...missingImportant, ...extraMissing]
  return {
    conditions: validated,
    missing_important: pruneMissingImportant(validated, mergedMissing),
  }
}

const INDUSTRY_KEYWORDS = [
  '제조업',
  '서비스업',
  'IT',
  '소프트웨어',
  '응용소프트웨어',
  '응용소프트웨어업',
  '유통',
  '도소매',
  '음식',
  '외식',
  '건설업',
  '농업',
  '수산업',
]

const PURPOSE_KEYWORDS = [
  '운전자금',
  '시설자금',
  '사업화',
  '마케팅',
  '수출',
  '고용',
  '인력',
  '연구개발',
  'R&D',
  '창업',
]

// Context7 패턴: Type.OBJECT + properties + nested schema
const EXTRACTED_CONDITION_STRING: Schema = {
  type: Type.OBJECT,
  properties: {
    value: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    source_text: { type: Type.STRING },
  },
  required: ['value', 'confidence'],
}

const EXTRACTED_CONDITION_NUMBER: Schema = {
  type: Type.OBJECT,
  properties: {
    value: { type: Type.NUMBER },
    confidence: { type: Type.NUMBER },
    source_text: { type: Type.STRING },
  },
  required: ['value', 'confidence'],
}

const EXTRACTED_CONDITION_BOOLEAN: Schema = {
  type: Type.OBJECT,
  properties: {
    value: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER },
    source_text: { type: Type.STRING },
  },
  required: ['value', 'confidence'],
}

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    conditions: {
      type: Type.OBJECT,
      properties: {
        region: EXTRACTED_CONDITION_STRING,
        city: EXTRACTED_CONDITION_STRING,
        industry: EXTRACTED_CONDITION_STRING,
        business_age_years: EXTRACTED_CONDITION_NUMBER,
        employee_count: EXTRACTED_CONDITION_NUMBER,
        annual_revenue_krw: EXTRACTED_CONDITION_NUMBER,
        desired_amount_krw: EXTRACTED_CONDITION_NUMBER,
        support_purpose: EXTRACTED_CONDITION_STRING,
        business_type: EXTRACTED_CONDITION_STRING,
        startup_stage: EXTRACTED_CONDITION_STRING,
        credit_score: EXTRACTED_CONDITION_NUMBER,
        tax_arrears: EXTRACTED_CONDITION_BOOLEAN,
      },
    },
    summary: { type: Type.STRING },
    missing_important: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    raw_query: { type: Type.STRING },
  },
  required: ['conditions', 'summary', 'missing_important', 'raw_query'],
}

const SYSTEM_INSTRUCTION = `당신은 정책자금 전문 AI 컨설턴트입니다.
사용자의 자연어 질문에서 정부지원사업 검색에 필요한 기업 조건을 추출합니다.

중요 규칙:
1. 언급되지 않은 항목은 conditions 객체에서 생략하세요.
2. 금액은 항상 원(KRW) 단위 정수로 변환하세요. (예: "1억" → 100000000, "3천만원" → 30000000)
3. 업력은 연 단위 숫자로 변환하세요. "3년"·"업력 3년"·"3년차"·"창업 18개월" 등은 모두 business_age_years 로 넣고, 그런 경우 missing_important 에 업력을 넣지 마세요.
4. confidence는 0~1 사이 값입니다. 명확히 언급 → 0.9+, 추론 → 0.5~0.8, 불확실 → 0.3 미만.
5. missing_important에는 conditions에 이미 채워진 항목을 절대 넣지 마세요.
   공고 검색에 중요하지만 언급·추출되지 않은 항목만 넣습니다 (지역·업종·업력 우선).
6. summary는 추출된 내용을 1~2문장으로 한국어로 요약하세요.
7. source_text는 반드시 짧게(최대 20자) 작성하세요.`

/**
 * 자연어 쿼리에서 기업 조건 추출
 */
export async function parseNaturalLanguage(query: string): Promise<ParseNLResult> {
  const prompt = `다음 질문에서 기업 조건을 추출해주세요:\n\n"${query}"`

  const result = await geminiJSON<ParseNLResult>(prompt, RESPONSE_SCHEMA, {
    systemInstruction: SYSTEM_INSTRUCTION,
    maxOutputTokens: 1536,
    temperature: 0.1,
  })

  const normalizedConditions = { ...result.conditions }
  if (normalizedConditions.industry?.value) {
    normalizedConditions.industry = {
      ...normalizedConditions.industry,
      value: toCanonicalIndustry(String(normalizedConditions.industry.value)),
    }
  }

  // Hybrid Confidence: 도메인 검증 레이어 적용
  const { conditions: validatedConditions, missing_important } = domainValidateConditions(
    normalizedConditions,
    result.missing_important
  )

  return {
    ...result,
    summary: normalizeParseSummaryText(result.summary),
    conditions: validatedConditions,
    missing_important,
    raw_query: query,
  }
}

/** 문장 끝(마지막 음절·약어)에 맞는 「으로/로」 선택 */
export function pickEuroParticle(phrase: string): '으로' | '로' {
  const trimmed = phrase.trim()
  if (!trimmed) return '으로'

  const last = [...trimmed].pop() ?? ''
  const code = last.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28
    if (jong === 0 || jong === 8) return '로'
    return '으로'
  }
  if (/[a-zA-Z]$/.test(trimmed)) return '로'
  return '으로'
}

/** 조건 요약 조각을 자연스러운 한국어 문장으로 연결 (「3년로」「IT으로」 같은 오류 방지) */
export function buildParseSummaryFromParts(summaryParts: string[]): string {
  if (summaryParts.length === 0) {
    return '질문에서 명확한 조건을 충분히 찾지 못했습니다. 조건을 보완해 다시 확인해주세요.'
  }
  const body =
    summaryParts.length === 1
      ? summaryParts[0]!
      : `${summaryParts.slice(0, -1).join(', ')}, ${summaryParts[summaryParts.length - 1]}`
  const particle = pickEuroParticle(body)
  return `${body}${particle} 추정됩니다. 누락된 조건은 직접 확인 후 수정해주세요.`
}

/** LLM·폴백 공통: 잘못된 조사(년로·IT으로 등) 보정 */
export function normalizeParseSummaryText(summary: string): string {
  return summary
    .replace(/(\d+)년로/g, '$1년으로')
    .replace(/(\d+)명로/g, '$1명으로')
    .replace(/, 로 추정/g, '으로 추정')
    .replace(/\bIT으로\b/g, 'IT로')
    .replace(/([A-Za-z]{2,})으로 추정/g, '$1로 추정')
}

/**
 * LLM 장애 시 규칙 기반 최소 조건 추출 폴백
 */
export function parseNaturalLanguageFallback(query: string): ParseNLResult {
  const conditions: ParsedConditions = {}

  for (const [region, aliases] of Object.entries(REGION_ALIASES)) {
    if (aliases.some((alias) => query.includes(alias))) {
      conditions.region = { value: region, confidence: 0.75, source_text: region }
      break
    }
  }

  const cityMatch = query.match(/([가-힣]{2,12})(시|군|구)/u)
  if (cityMatch) {
    conditions.city = {
      value: `${cityMatch[1]}${cityMatch[2]}`,
      confidence: 0.65,
      source_text: cityMatch[0].slice(0, 20),
    }
  }

  const industry = INDUSTRY_KEYWORDS.find((k) => query.includes(k))
  if (industry) {
    conditions.industry = { value: toCanonicalIndustry(industry), confidence: 0.7, source_text: industry }
  }

  const ageUnderMatch = query.match(/(\d+(?:\.\d+)?)\s*년\s*미만/u)
  if (ageUnderMatch) {
    const upper = Number(ageUnderMatch[1])
    const normalized = Math.max(0, upper - 1)
    conditions.business_age_years = {
      value: normalized,
      confidence: 0.7,
      source_text: ageUnderMatch[0].slice(0, 20),
    }
  } else {
    const ageMatch = query.match(/(\d+(?:\.\d+)?)\s*년차/u)
    if (ageMatch) {
      conditions.business_age_years = {
        value: Number(ageMatch[1]),
        confidence: 0.7,
        source_text: ageMatch[0].slice(0, 20),
      }
    } else {
      const monthMatch = query.match(/(\d+)\s*개월/u)
      if (monthMatch) {
        conditions.business_age_years = {
          value: Math.round((Number(monthMatch[1]) / 12) * 10) / 10,
          confidence: 0.6,
          source_text: monthMatch[0].slice(0, 20),
        }
      } else {
        const keywordYear = query.match(
          /(?:업력|창업|운영|경력|사업\s*기간|경과)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*년/u
        )
        if (keywordYear) {
          conditions.business_age_years = {
            value: Number(keywordYear[1]),
            confidence: 0.68,
            source_text: keywordYear[0].slice(0, 20),
          }
        } else {
          // "3년"만 말한 경우 (년차·개월·년 미만 아님) — 2025년 같은 연도는 제외
          const plain = query.match(/(?<![0-9])(\d{1,3}(?:\.\d+)?)\s*년(?!\s*미만)(?!\s*전)(?!\s*도)(?!\s*월)/u)
          if (plain) {
            const n = Number(plain[1])
            if (Number.isFinite(n) && n >= 0 && n <= 100 && n < 1900) {
              conditions.business_age_years = {
                value: n,
                confidence: 0.55,
                source_text: plain[0].slice(0, 20),
              }
            }
          }
        }
      }
    }
  }

  const employeeMatch = query.match(/(?:직원|상시근로자)?\s*(\d+)\s*명/u)
  if (employeeMatch) {
    conditions.employee_count = {
      value: Number(employeeMatch[1]),
      confidence: 0.65,
      source_text: employeeMatch[0].slice(0, 20),
    }
  }

  if (/체납\s*(없|무)/u.test(query)) {
    conditions.tax_arrears = { value: false, confidence: 0.7, source_text: '체납 없음' }
  } else if (/체납\s*(있|유)/u.test(query)) {
    conditions.tax_arrears = { value: true, confidence: 0.7, source_text: '체납 있음' }
  }

  const purpose = PURPOSE_KEYWORDS.find((k) => query.toLowerCase().includes(k.toLowerCase()))
  if (purpose) {
    conditions.support_purpose = { value: purpose, confidence: 0.7, source_text: purpose }
  }

  const importantKeys: (keyof ParsedConditions)[] = ['region', 'industry', 'business_age_years']
  const missing_important = importantKeys.filter((k) => !conditions[k]).map((k) => String(k))

  const summaryParts: string[] = []
  if (conditions.region?.value) summaryParts.push(`지역은 ${conditions.region.value}`)
  if (conditions.city?.value) summaryParts.push(`시군구는 ${conditions.city.value}`)
  if (conditions.industry?.value) summaryParts.push(`업종은 ${conditions.industry.value}`)
  if (conditions.business_age_years?.value != null) {
    const ageSrc = conditions.business_age_years.source_text
    if (ageSrc?.includes('미만')) {
      summaryParts.push(`업력은 ${ageSrc}`)
    } else {
      summaryParts.push(`업력은 ${conditions.business_age_years.value}년`)
    }
  }
  if (conditions.support_purpose?.value) summaryParts.push(`지원 목적은 ${conditions.support_purpose.value}`)

  const summary = buildParseSummaryFromParts(summaryParts)

  // Hybrid Confidence: fallback에도 동일 도메인 검증 적용
  const { conditions: validatedConditions, missing_important: validatedMissing } =
    domainValidateConditions(conditions, missing_important)

  return {
    conditions: validatedConditions,
    summary,
    missing_important: validatedMissing,
    raw_query: query,
  }
}

/**
 * ParsedConditions → BusinessConditions (확신도 threshold 이상만 적용)
 */
export function toBusinessConditions(
  parsed: ParsedConditions,
  threshold = 0.4
): BusinessConditions {
  const result: BusinessConditions = {}

  const apply = <K extends keyof BusinessConditions>(
    key: K,
    extracted?: ExtractedCondition<BusinessConditions[K]>
  ) => {
    if (extracted && extracted.confidence >= threshold) {
      result[key] = extracted.value
    }
  }

  apply('region', parsed.region as ExtractedCondition<string>)
  apply('city', parsed.city as ExtractedCondition<string>)
  apply('industry', parsed.industry as ExtractedCondition<string>)
  apply('business_age_years', parsed.business_age_years as ExtractedCondition<number>)
  apply('employee_count', parsed.employee_count as ExtractedCondition<number>)
  apply('annual_revenue_krw', parsed.annual_revenue_krw as ExtractedCondition<number>)
  apply('desired_amount_krw', parsed.desired_amount_krw as ExtractedCondition<number>)
  apply('support_purpose', parsed.support_purpose as ExtractedCondition<string>)
  apply('business_type', parsed.business_type as ExtractedCondition<string>)
  apply('startup_stage', parsed.startup_stage as ExtractedCondition<string>)
  apply('credit_score', parsed.credit_score as ExtractedCondition<number>)
  apply('tax_arrears', parsed.tax_arrears as ExtractedCondition<boolean>)

  return result
}
