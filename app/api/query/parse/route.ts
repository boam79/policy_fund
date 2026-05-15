/**
 * POST /api/query/parse
 * 자연어 → 기업 조건 추출 API
 *
 * 서버 전용: GEMINI_API_KEY는 절대 클라이언트에 노출하지 않는다.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  parseNaturalLanguage,
  parseNaturalLanguageFallback,
  toBusinessConditions,
} from '@/lib/query/parseNaturalLanguage'
import type { ApiResponse } from '@/types'
import { takeRateLimit } from '@/lib/security/rateLimit'
import { apiError, createTraceId, logApiError } from '@/lib/errors/apiError'

export const runtime = 'nodejs'
export const maxDuration = 30

interface ParseRequestBody {
  query: string
}

export async function POST(req: NextRequest): Promise<Response> {
  const traceId = createTraceId()
  let queryText = ''
  try {
    const rate = takeRateLimit(req, 'api:query-parse', { windowMs: 60_000, max: 20 })
    if (!rate.ok) {
      return apiError({
        status: 429,
        errorCode: 'PARSE_RATE_LIMITED',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        step: 'query.parse.rate_limit',
        traceId,
      })
    }

    const body = (await req.json()) as ParseRequestBody
    const { query } = body
    queryText = typeof query === 'string' ? query.trim() : ''

    if (!query || typeof query !== 'string' || queryText.length === 0) {
      return apiError({
        status: 400,
        errorCode: 'PARSE_INVALID_INPUT',
        message: '검색어를 입력해주세요.',
        step: 'query.parse.validate',
        traceId,
      })
    }

    if (query.length > 500) {
      return apiError({
        status: 400,
        errorCode: 'PARSE_QUERY_TOO_LONG',
        message: '검색어는 500자 이내로 입력해주세요.',
        step: 'query.parse.validate',
        traceId,
      })
    }

    const parsed = await parseNaturalLanguage(queryText)
    const conditions = toBusinessConditions(parsed.conditions)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        parsed,
        conditions,
      },
    })
  } catch (error) {
    logApiError('/api/query/parse', traceId, error)

    const rawMessage =
      error instanceof Error ? error.message : '조건 추출 중 오류가 발생했습니다.'
    const isTemporaryLlmIssue =
      /UNAVAILABLE|503|high demand|RESOURCE_EXHAUSTED|overloaded/i.test(rawMessage)
    const isGeminiMisconfigured =
      /GEMINI_API_KEY|설정되지 않았습니다|missing.*api.?key/i.test(rawMessage)

    const message = isTemporaryLlmIssue || isGeminiMisconfigured
      ? 'AI 분석 서버가 일시적으로 혼잡합니다. 키워드 기반 검색으로 계속 진행해주세요.'
      : rawMessage

    // LLM 혼잡·키 미설정 등일 때 규칙 기반 추출로 진단·검색은 계속된다
    if ((isTemporaryLlmIssue || isGeminiMisconfigured) && queryText.length > 0) {
      const parsed = parseNaturalLanguageFallback(queryText)
      const conditions = toBusinessConditions(parsed.conditions, 0.3)
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          parsed,
          conditions,
          fallback: 'rule_based',
        },
      })
    }

    return apiError({
      status: 500,
      errorCode: 'PARSE_INTERNAL_ERROR',
      message,
      step: 'query.parse.execute',
      traceId,
    })
  }
}
