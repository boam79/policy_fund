/**
 * GET /api/home/recommendations
 * 홈 화면 추천 공고 배너 목록 반환 (공개 데이터, 쿠키 불필요)
 * PRD §19.6.3 메인 배너 조회 기준
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const revalidate = 1800 // 30분 ISR 캐시

function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export interface RecommendedProgram {
  id: string
  source: string
  title: string
  organization: string | null
  region: string | null
  support_type: string | null
  application_end_date: string | null
  application_url: string | null
  status: string
  days_left: number | null
}

export async function GET() {
  try {
    const supabase = createPublicClient()

    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('support_programs')
      .select(
        'id, source, title, organization, region, support_type, application_end_date, application_url, status, recommendation_score'
      )
      .eq('visibility_status', 'visible')
      .in('status', ['active', 'closing_soon'])
      .gte('application_end_date', today)
      .not('application_url', 'is', null)
      .order('recommendation_score', { ascending: false })
      .order('application_end_date', { ascending: true })
      .limit(10)

    if (error) throw error

    const now = Date.now()
    const programs: RecommendedProgram[] = (data ?? []).map((p) => {
      const daysLeft = p.application_end_date
        ? Math.ceil(
            (new Date(p.application_end_date).getTime() - now) /
              (1000 * 60 * 60 * 24)
          )
        : null
      return {
        id: p.id,
        source: p.source,
        title: p.title,
        organization: p.organization,
        region: p.region,
        support_type: p.support_type,
        application_end_date: p.application_end_date,
        application_url: p.application_url,
        status: p.status,
        days_left: daysLeft,
      }
    })

    return Response.json({ ok: true, data: programs, count: programs.length })
  } catch (err) {
    console.error('[recommendations] 오류:', err)
    return Response.json(
      { ok: false, error: '추천 공고를 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}
