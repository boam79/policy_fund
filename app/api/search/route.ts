/**
 * POST /api/search
 * 조건 기반 공고 검색 + 자격판정 배지 포함
 */

import type { NextRequest } from 'next/server'
import type { CompanyProfile } from '@/lib/gov-support/tools/eligibility'
import { checkEligibility } from '@/lib/gov-support/tools/eligibility'
import {
  collectSearchTextTerms,
  normalizeProgramSearchMode,
  runProgramSearch,
} from '@/lib/gov-support/tools/runProgramSearch'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { takeRateLimit } from '@/lib/security/rateLimit'
import { apiError, createTraceId, logApiError } from '@/lib/errors/apiError'
import { sanitizeProgramForClient } from '@/lib/utils/stripHtml'

export const dynamic = 'force-dynamic'

const STRICT_NO_RESULTS_HINT =
  '입력한 지역·업종·검색어 조건을 모두 만족하는 공고가 없습니다. 지역·업종을 넓히거나, 검색 화면에서 조건 완화 검색을 이용해 보세요.'

export async function POST(request: NextRequest) {
  const traceId = createTraceId()
  try {
    const rate = takeRateLimit(request, 'api:search', { windowMs: 60_000, max: 40 })
    if (!rate.ok) {
      return apiError({
        status: 429,
        errorCode: 'SEARCH_RATE_LIMITED',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        step: 'search.rate_limit',
        traceId,
      })
    }

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
      search_mode: searchModeRaw,
    } = body as CompanyProfile & {
      keyword?: string
      page?: number
      limit?: number
      search_mode?: string
    }

    const search_mode = normalizeProgramSearchMode(searchModeRaw)

    const initialSearch = {
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
    }

    const { result, effectiveSearch, fallbackApplied } = await runProgramSearch(
      initialSearch,
      search_mode
    )

    const appliedTextTerms = collectSearchTextTerms({
      industry: effectiveSearch.industry,
      support_purpose: effectiveSearch.support_purpose,
      keyword: effectiveSearch.keyword,
    })

    const applied_filters = {
      region: effectiveSearch.region ?? null,
      city: effectiveSearch.city ?? null,
      industry: effectiveSearch.industry ?? null,
      keyword: effectiveSearch.keyword ?? null,
      support_purpose: effectiveSearch.support_purpose ?? null,
      business_age_years: business_age_years ?? null,
      employee_count: employee_count ?? null,
      text_terms: appliedTextTerms,
    }

    if (search_mode === 'strict' && result.total === 0) {
      return apiError({
        status: 404,
        errorCode: 'SEARCH_NO_RESULTS_STRICT',
        message: '입력하신 조건을 모두 만족하는 공고를 찾지 못했습니다.',
        step: 'search.query.strict',
        traceId,
        meta: {
          search_mode,
          applied_filters,
          hint: STRICT_NO_RESULTS_HINT,
        },
      })
    }

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

    const programsWithEligibility = result.programs.map((raw) => {
      const p = sanitizeProgramForClient(raw)
      const eligibility = checkEligibility(profile, {
        title: p.title,
        region: p.region,
        industry: p.industry,
        industry_tags: raw.industry_tags ?? null,
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

    programsWithEligibility.sort((a, b) => {
      const recA = a.recommendation_score ?? 0
      const recB = b.recommendation_score ?? 0
      if (recB !== recA) return recB - recA
      return (b.eligibility?.score ?? 0) - (a.eligibility?.score ?? 0)
    })

    try {
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      await supabase.from('search_sessions').insert({
        natural_language_query: keyword ?? null,
        extracted_conditions: JSON.parse(JSON.stringify({ ...profile, search_mode })),
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
      search_mode,
      fallback_applied: fallbackApplied.length > 0 ? fallbackApplied : null,
      applied_filters,
      trace_id: traceId,
    })
  } catch (e: unknown) {
    logApiError('/api/search', traceId, e)
    return apiError({
      status: 500,
      errorCode: 'SEARCH_INTERNAL_ERROR',
      message: '검색 중 오류가 발생했습니다.',
      step: 'search.execute',
      traceId,
    })
  }
}
