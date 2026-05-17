/**
 * GET /api/home/recommendations
 * 홈 화면 추천 공고 배너 목록 반환 (공개 데이터, 쿠키 불필요)
 * PRD §19.6.3 메인 배너 조회 기준
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { fetchRecommendedPrograms } from '@/lib/home/recommendations'

export const revalidate = 1800 // 30분 ISR 캐시

export type { RecommendedProgram } from '@/lib/home/recommendations'

function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET() {
  try {
    const programs = await fetchRecommendedPrograms(createPublicClient(), 10)
    return Response.json({ ok: true, data: programs, count: programs.length })
  } catch (err) {
    console.error('[recommendations] 오류:', err)
    return Response.json(
      { ok: false, error: '추천 공고를 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}
