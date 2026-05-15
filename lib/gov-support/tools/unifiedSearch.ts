/**
 * 통합 공고 검색 — DB 우선, 결과 부족 시 공공 API fallback
 * PRD §5.2 데이터 운영 모드: api_minimal_cache
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export interface SearchParams {
  region?: string
  city?: string
  industry?: string
  business_age_years?: number | null
  employee_count?: number | null
  annual_revenue_krw?: number | null
  support_purpose?: string | null
  keyword?: string | null
  page?: number
  limit?: number
}

export type SupportProgram = Database['public']['Tables']['support_programs']['Row']

export interface SearchResult {
  programs: SupportProgram[]
  total: number
  source: 'db' | 'api_fallback'
  page: number
  limit: number
}

const REGION_MAP: Record<string, string[]> = {
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
  전국: ['전국'],
}

const CITY_TO_REGION: Record<string, string> = {
  수원: '경기',
  성남: '경기',
  고양: '경기',
  용인: '경기',
  부천: '경기',
  안산: '경기',
  안양: '경기',
  남양주: '경기',
  화성: '경기',
  평택: '경기',
  의정부: '경기',
  시흥: '경기',
  파주: '경기',
  김포: '경기',
  광명: '경기',
  광주: '경기',
  군포: '경기',
  오산: '경기',
  이천: '경기',
  안성: '경기',
  구리: '경기',
  의왕: '경기',
  하남: '경기',
  양주: '경기',
  동두천: '경기',
  과천: '경기',
  여주: '경기',
  양평: '경기',
  가평: '경기',
  연천: '경기',
  포천: '경기',
}

/** 지역명 정규화 (예: "경기도 수원시" → "경기") */
function normalizeRegion(raw: string): string {
  for (const [key, aliases] of Object.entries(REGION_MAP)) {
    if (aliases.some((a) => raw.includes(a))) return key
  }
  return raw.slice(0, 2)
}

/** 시/군 입력 시 광역시도 보정 (예: "양주시" -> "경기") */
function inferRegionFromCity(rawCity: string): string | null {
  const city = rawCity.replace(/\s+/g, '').replace(/(시|군|구)$/u, '')
  if (!city) return null
  return CITY_TO_REGION[city] ?? null
}

export async function unifiedSearch(params: SearchParams): Promise<SearchResult> {
  const {
    region,
    city,
    industry,
    support_purpose,
    keyword,
    page = 1,
    limit = 20,
  } = params

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const offset = (page - 1) * limit
  const today = new Date().toISOString().slice(0, 10)

  let query = supabase
    .from('support_programs')
    .select('*', { count: 'exact' })
    .in('status', ['active', 'closing_soon'])
    .eq('visibility_status', 'visible')
    .or(`application_end_date.gte.${today},application_end_date.is.null`)
    .order('recommendation_score', { ascending: false, nullsFirst: false })
    .order('application_end_date', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1)

  // 지역 필터 (전국 공고는 항상 포함)
  if (region) {
    const normalized = normalizeRegion(region)
    query = query.or(
      `region.ilike.%${normalized}%,region.ilike.%전국%,region.is.null`
    )
  } else if (city) {
    const normalizedCity = city.replace(/\s+/g, '')
    const inferredRegion = inferRegionFromCity(city)
    const cityOrRegionFilters = [
      `region.ilike.%${normalizedCity}%`,
      inferredRegion ? `region.ilike.%${inferredRegion}%` : null,
      'region.ilike.%전국%',
      'region.is.null',
    ]
      .filter(Boolean)
      .join(',')
    query = query.or(cityOrRegionFilters)
  }

  // 업종 필터
  if (industry) {
    query = query.or(
      `industry.ilike.%${industry}%,support_type.ilike.%${industry}%,eligibility_text.ilike.%${industry}%`
    )
  }

  // 키워드 검색
  const effectiveKeyword = keyword ?? support_purpose ?? null
  if (effectiveKeyword) {
    query = query.or(
      `title.ilike.%${effectiveKeyword}%,organization.ilike.%${effectiveKeyword}%,support_type.ilike.%${effectiveKeyword}%,eligibility_text.ilike.%${effectiveKeyword}%`
    )
  }

  const { data, count, error } = await query

  if (error) {
    console.error('[unifiedSearch] DB 오류:', error.message)
    return { programs: [], total: 0, source: 'db', page, limit }
  }

  return {
    programs: data ?? [],
    total: count ?? 0,
    source: 'db',
    page,
    limit,
  }
}
