/**
 * 통합 공고 검색 — DB 우선, 결과 부족 시 공공 API fallback
 * PRD §5.2 데이터 운영 모드: api_minimal_cache
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import {
  PROGRAM_SEARCH_POOL_STATUSES,
  programSearchPoolEndDateOr,
  todayISODate,
} from './programSearchPool'

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

const REGION_CITY_ALIASES: Record<string, string[]> = {
  서울: ['강남', '강동', '강북', '강서', '관악', '광진', '구로', '금천', '노원', '도봉', '동대문', '동작', '마포', '서대문', '서초', '성동', '성북', '송파', '양천', '영등포', '용산', '은평', '종로', '중랑'],
  인천: ['강화', '옹진', '계양', '미추홀', '남동', '동구', '부평', '서구', '연수', '중구'],
  부산: ['기장', '강서', '금정', '남구', '동구', '동래', '부산진', '북구', '사상', '사하', '서구', '수영', '연제', '영도', '중구', '해운대'],
  대구: ['군위', '남구', '달서', '달성', '동구', '북구', '서구', '수성', '중구'],
  광주: ['광산', '남구', '동구', '북구', '서구'],
  대전: ['대덕', '동구', '서구', '유성', '중구'],
  울산: ['남구', '동구', '북구', '울주', '중구'],
  세종: ['세종'],
  경기: ['수원', '성남', '고양', '용인', '부천', '안산', '안양', '남양주', '화성', '평택', '의정부', '시흥', '파주', '김포', '광명', '광주', '군포', '오산', '이천', '안성', '구리', '의왕', '하남', '양주', '동두천', '과천', '여주', '양평', '가평', '연천', '포천'],
  강원: ['춘천', '원주', '강릉', '동해', '태백', '속초', '삼척', '홍천', '횡성', '영월', '평창', '정선', '철원', '화천', '양구', '인제', '고성', '양양'],
  충북: ['청주', '충주', '제천', '보은', '옥천', '영동', '증평', '진천', '괴산', '음성', '단양'],
  충남: ['천안', '공주', '보령', '아산', '서산', '논산', '계룡', '당진', '금산', '부여', '서천', '청양', '홍성', '예산', '태안'],
  전북: ['전주', '군산', '익산', '정읍', '남원', '김제', '완주', '진안', '무주', '장수', '임실', '순창', '고창', '부안'],
  전남: ['목포', '여수', '순천', '나주', '광양', '담양', '곡성', '구례', '고흥', '보성', '화순', '장흥', '강진', '해남', '영암', '무안', '함평', '영광', '장성', '완도', '진도', '신안'],
  경북: ['포항', '경주', '김천', '안동', '구미', '영주', '영천', '상주', '문경', '경산', '의성', '청송', '영양', '영덕', '청도', '고령', '성주', '칠곡', '예천', '봉화', '울진', '울릉'],
  경남: ['창원', '진주', '통영', '사천', '김해', '밀양', '거제', '양산', '의령', '함안', '창녕', '고성', '남해', '하동', '산청', '함양', '거창', '합천'],
  제주: ['제주', '서귀포'],
}

const CITY_TO_REGION: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_CITY_ALIASES).flatMap(([region, cities]) =>
    cities.map((name) => [name, region] as const)
  )
)

/** 지역명 정규화 (예: "경기도 수원시" → "경기") */
function normalizeRegion(raw: string): string {
  for (const [key, aliases] of Object.entries(REGION_MAP)) {
    if (aliases.some((a) => raw.includes(a))) return key
  }
  return raw.slice(0, 2)
}

/** 시/군 입력 시 광역시도 보정 (예: "양주시" -> "경기") */
function inferRegionFromCity(rawCity: string): string | null {
  for (const [region, aliases] of Object.entries(REGION_MAP)) {
    if (aliases.some((a) => rawCity.includes(a))) return region
  }

  const city = rawCity
    .replace(/\s+/g, '')
    .replace(/(특별자치시|특별자치도|특별시|광역시|자치시|시|군|구)$/u, '')
  if (!city) return null
  return CITY_TO_REGION[city] ?? null
}

/**
 * 통계상 region 컬럼이 비어 있거나 '전국'인 공고가 많아서, 지역 검색 결과가 거의 안 나오는 문제를 줄인다.
 * — 지역 키(또는 광역시도 별명) 매칭
 * — 전국
 * — DB 미기재(null / 빈 문자열)까지 포함해 이후 업종·키워드 필터와 조합된다.
 */
function buildRegionPredicateOr(normalizedRegionalKey: string): string {
  const aliases =
    REGION_MAP[normalizedRegionalKey as keyof typeof REGION_MAP] ?? [normalizedRegionalKey]
  return [
    'region.is.null',
    'region.eq.',
    ...aliases.map((a) => `region.ilike.%${a}%`),
    'region.ilike.%전국%',
  ].join(',')
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
  const today = todayISODate()

  let query = supabase
    .from('support_programs')
    .select('*', { count: 'exact' })
    .in('status', [...PROGRAM_SEARCH_POOL_STATUSES])
    .eq('visibility_status', 'visible')
    .or(programSearchPoolEndDateOr(today))
    .order('recommendation_score', { ascending: false, nullsFirst: false })
    .order('application_end_date', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1)

  // 지역 필터 — 명시 매칭 + 전국 + 지역 미기재(null·빈값) 포함
  if (region) {
    const normalized = normalizeRegion(region)
    if (normalized !== '전국') {
      query = query.or(buildRegionPredicateOr(normalized))
    }
  } else if (city) {
    const normalizedCity = city.replace(/\s+/g, '')
    const inferredRegion = inferRegionFromCity(city)
    const inferredAliases = inferredRegion ? REGION_MAP[inferredRegion as keyof typeof REGION_MAP] ?? [] : []
    const cityOrRegionFilters = [
      'region.is.null',
      'region.eq.',
      `region.ilike.%${normalizedCity}%`,
      inferredRegion ? `region.ilike.%${inferredRegion}%` : null,
      ...inferredAliases.map((a) => `region.ilike.%${a}%`),
      'region.ilike.%전국%',
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
  const normalizedSupportPurpose = support_purpose?.trim() ?? ''
  const normalizedKeyword = keyword?.trim() ?? ''
  const effectiveKeyword =
    normalizedSupportPurpose.length > 0
      ? normalizedSupportPurpose
      : normalizedKeyword.length > 0
        ? normalizedKeyword
        : null
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
