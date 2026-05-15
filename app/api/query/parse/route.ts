/**
 * POST /api/query/parse
 * 자연어 → 기업 조건 추출 API
 *
 * 서버 전용: GEMINI_API_KEY는 절대 클라이언트에 노출하지 않는다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseNaturalLanguage, toBusinessConditions } from '@/lib/query/parseNaturalLanguage'
import type { ApiResponse } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

interface ParseRequestBody {
  query: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as ParseRequestBody
    const { query } = body

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
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

    const parsed = await parseNaturalLanguage(query.trim())
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

    const message =
      error instanceof Error ? error.message : '조건 추출 중 오류가 발생했습니다.'

    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
