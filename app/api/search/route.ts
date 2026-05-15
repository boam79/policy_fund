/**
 * POST /api/search
 * 조건 기반 공고 검색 + 자격판정 배지 포함
 */

import type { NextRequest } from 'next/server'
import { unifiedSearch } from '@/lib/gov-support/tools/unifiedSearch'
import { checkEligibility } from '@/lib/gov-support/tools/eligibility'
import type { CompanyProfile } from '@/lib/gov-support/tools/eligibility'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      region,
      city,
      industry,
      business_age_years,
      employee_count,
      annual_revenue_krw,
      credit_score,
      tax_arrears,
      support_purpose,
      keyword,
      page = 1,
      limit = 20,
    } = body as CompanyProfile & { keyword?: string; page?: number; limit?: number }

    // 공고 검색
    const result = await unifiedSearch({
      region: region ?? undefined,
      city: city ?? undefined,
      industry: industry ?? undefined,
      business_age_years,
      employee_count,
      annual_revenue_krw,
      support_purpose,
      keyword,
      page,
      limit,
    })

    const profile: CompanyProfile = {
      region,
      city,
      industry,
      business_age_years,
      employee_count,
      annual_revenue_krw,
      credit_score,
      tax_arrears,
      support_purpose,
    }

    // 각 공고에 자격판정 배지 추가
    const programsWithEligibility = result.programs.map((p) => {
      const eligibility = checkEligibility(profile, {
        title: p.title,
        region: p.region,
        industry: p.industry,
        eligibility_text: p.eligibility_text,
        exclusion_text: p.exclusion_text,
        support_type: p.support_type,
        support_amount_min_krw: p.support_amount_min_krw,
        support_amount_max_krw: p.support_amount_max_krw,
        target_business_type: p.target_business_type,
      })

      const endDate = p.application_end_date
      const daysLeft = endDate
        ? Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

      return {
        ...p,
        eligibility,
        days_left: daysLeft,
      }
    })

    // search_sessions 저장 (선택, 실패해도 검색 결과 반환)
    try {
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      await supabase.from('search_sessions').insert({
        natural_language_query: keyword ?? null,
        extracted_conditions: JSON.parse(JSON.stringify(profile)),
        result_count: result.total,
        sort: 'recommendation_score',
      })
    } catch {
      // 로그 저장 실패는 무시
    }

    return Response.json({
      ok: true,
      programs: programsWithEligibility,
      total: result.total,
      page,
      limit,
      source: result.source,
    })
  } catch (e: unknown) {
    console.error('[api/search]', e)
    return Response.json(
      { error: '검색 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
