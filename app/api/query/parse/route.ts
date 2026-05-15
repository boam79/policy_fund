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

export const runtime = 'nodejs'
export const maxDuration = 30

interface ParseRequestBody {
  query: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let queryText = ''
  try {
    const body = (await req.json()) as ParseRequestBody
    const { query } = body
    queryText = typeof query === 'string' ? query.trim() : ''

    if (!query || typeof query !== 'string' || queryText.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '검색어를 입력해주세요.' },
        { status: 400 }
      )
    }

    if (query.length > 500) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '검색어는 500자 이내로 입력해주세요.' },
        { status: 400 }
      )
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
    console.error('[/api/query/parse] error:', error)

    const rawMessage =
      error instanceof Error ? error.message : '조건 추출 중 오류가 발생했습니다.'
    const isTemporaryLlmIssue =
      /UNAVAILABLE|503|high demand|RESOURCE_EXHAUSTED|overloaded/i.test(rawMessage)
    const message = isTemporaryLlmIssue
      ? 'AI 분석 서버가 일시적으로 혼잡합니다. 키워드 기반 검색으로 계속 진행해주세요.'
      : rawMessage

    // LLM 혼잡/일시 장애 시에는 규칙 기반 추출로 진단 흐름을 유지
    if (isTemporaryLlmIssue && queryText.length > 0) {
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

    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
