import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const revalidate = 1800

export async function GET() {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const today = new Date().toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  // 마감 임박 (7일 이내)
  const { data: closingSoon } = await supabase
    .from('support_programs')
    .select('id,title,organization,application_end_date,status,source,region,support_amount_max_krw')
    .eq('visibility_status', 'visible')
    .in('status', ['active', 'closing_soon'])
    .gte('application_end_date', today)
    .lte('application_end_date', new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
    .order('application_end_date', { ascending: true })
    .limit(5)

  // 신규 등록 (7일 이내)
  const { data: newlyAdded } = await supabase
    .from('support_programs')
    .select('id,title,organization,application_end_date,status,source,region,support_amount_max_krw')
    .eq('visibility_status', 'visible')
    .in('status', ['active', 'closing_soon'])
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(5)

  // 높은 추천 점수
  const { data: topRecommended } = await supabase
    .from('support_programs')
    .select('id,title,organization,application_end_date,status,source,region,support_amount_max_krw,recommendation_score')
    .eq('visibility_status', 'visible')
    .in('status', ['active', 'closing_soon'])
    .gte('application_end_date', today)
    .order('recommendation_score', { ascending: false })
    .limit(5)

  return NextResponse.json({
    closing_soon: closingSoon ?? [],
    newly_added: newlyAdded ?? [],
    top_recommended: topRecommended ?? [],
  })
}
