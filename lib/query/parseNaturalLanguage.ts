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
3. 업력은 연 단위 숫자로 변환하세요. (예: "3년차" → 3, "창업 18개월" → 1.5)
4. confidence는 0~1 사이 값입니다. 명확히 언급 → 0.9+, 추론 → 0.5~0.8, 불확실 → 0.3 미만.
5. missing_important에는 공고 검색에 중요하지만 언급되지 않은 항목만 포함하세요.
   (지역·업종·업력 중 누락 항목 우선)
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

  return { ...result, raw_query: query }
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
