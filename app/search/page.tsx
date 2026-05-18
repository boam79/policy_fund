'use client'

import { useState, useCallback, useEffect, useLayoutEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, Building2, MapPin, Calendar, ExternalLink, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import FeedbackWidget from '@/components/FeedbackWidget'
import {
  eligibilityLabel,
  eligibilityColor,
  eligibilityPrimaryReason,
  type EligibilityStatus,
} from '@/lib/gov-support/tools/eligibility'
import type { ProgramSearchMode } from '@/lib/gov-support/tools/runProgramSearch'
import {
  INDUSTRY_MATCH_LABELS,
  type IndustryMatchMode,
  normalizeIndustryMatchMode,
} from '@/lib/gov-support/tools/industryMatch'
import type { SupportProgram } from '@/lib/gov-support/tools/unifiedSearch'
import { readApiError } from '@/lib/api/readApiError'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import GeoSourceSummary from '@/components/geo/GeoSourceSummary'
import { toCanonicalIndustry } from '@/lib/industry/canonical'
import { fetchMyBusinessProfileDefaults } from '@/lib/profile/fetch-my-business-profile'
import { buildSearchUrlFromProfile } from '@/lib/profile/business-profile-defaults'
import SearchEmptyStatePanel from '@/components/search/SearchEmptyState'
import type { SearchEmptyState, SearchFilterSnapshot } from '@/lib/search/emptyResult'
import { buildSearchEmptyState, lowConfidenceFieldKeys } from '@/lib/search/emptyResult'
import {
  hasDefaultBrowseIntent,
  hasSearchFilterParams,
} from '@/lib/search/browse'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'

interface EligibilityResult {
  status: EligibilityStatus
  score: number
  passed: string[]
  failed: string[]
  unknown: string[]
}

interface ProgramWithEligibility extends SupportProgram {
  eligibility: EligibilityResult
  days_left: number | null
}

const INDUSTRIES = ['제조업', '서비스업', 'IT/소프트웨어', '유통/도소매', '음식/외식', '건설업', '기타']
const REGIONS = ['전국', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

const LEGAL_DISCLAIMER = '본 자격판정 결과는 AI 기반 참고 정보이며 법적 효력이 없습니다. 실제 신청 가능 여부는 해당 지원기관의 공식 공고문을 반드시 확인하세요.'

const FALLBACK_LABELS: Record<string, string> = {
  drop_keyword: '검색어·지원목적 조건을 완화했습니다.',
  drop_city: '시·군 조건을 완화했습니다.',
  drop_industry: '업종 조건을 완화했습니다.',
}

const REGION_FILTER_HINT =
  '선택한 지역·전국 단위 공고만 표시합니다. 지역 미기재 공고는 제외됩니다.'

type AppliedFilters = SearchFilterSnapshot & { text_terms?: string[] }

function readParseLowConfidenceFields(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('pf:last_parsed')
    if (!raw) return []
    const parsed = JSON.parse(raw) as ParseNLResult
    return lowConfidenceFieldKeys(
      parsed.conditions as Record<string, { confidence?: number } | undefined>
    )
  } catch {
    return []
  }
}

const REGION_NORMALIZE_MAP: Record<string, string> = {
  서울특별시: '서울',
  경기도: '경기',
  인천광역시: '인천',
  부산광역시: '부산',
  대구광역시: '대구',
  광주광역시: '광주',
  대전광역시: '대전',
  울산광역시: '울산',
  세종특별자치시: '세종',
  강원도: '강원',
  강원특별자치도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전라북도: '전북',
  전북특별자치도: '전북',
  전라남도: '전남',
  경상북도: '경북',
  경상남도: '경남',
  제주도: '제주',
  제주특별자치도: '제주',
}

function normalizeRegionForFilter(value: string | null): string {
  if (!value) return ''
  const raw = value.trim()
  if (!raw) return ''
  return REGION_NORMALIZE_MAP[raw] ?? raw
}

function buildSearchQueryString(input: {
  region: string
  city: string
  industry: string
  keyword: string
  supportPurpose: string
  businessAge: string
  employeeCount: string
  taxArrears: string
  searchMode?: ProgramSearchMode
  industryMatch?: IndustryMatchMode
  includeClosed?: boolean
}): string {
  const params = new URLSearchParams()
  if (input.region) params.set('region', input.region)
  if (input.city) params.set('city', input.city)
  if (input.industry) params.set('industry', input.industry)
  if (input.industryMatch && input.industryMatch !== 'match') {
    params.set('industry_match', input.industryMatch)
  }
  if (input.supportPurpose) params.set('support_purpose', input.supportPurpose)
  if (input.keyword.trim()) params.set('keyword', input.keyword.trim())
  if (input.businessAge) params.set('business_age_years', input.businessAge)
  if (input.employeeCount) params.set('employee_count', input.employeeCount)
  if (input.taxArrears) params.set('tax_arrears', input.taxArrears)
  if (input.searchMode === 'strict') params.set('search_mode', 'strict')
  if (input.includeClosed) params.set('include_closed', '1')
  return params.toString()
}

function FilterChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-800">
      {label}: {value}
    </span>
  )
}

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoSearchKeyRef = useRef('')

  const [region, setRegion] = useState(() => normalizeRegionForFilter(searchParams.get('region')))
  const [city] = useState(() => searchParams.get('city') ?? '')
  const [industry, setIndustry] = useState(() =>
    toCanonicalIndustry(searchParams.get('industry') ?? '')
  )
  const [keyword, setKeyword] = useState(() => searchParams.get('keyword') ?? searchParams.get('q') ?? '')
  const [supportPurpose] = useState(() => searchParams.get('support_purpose') ?? '')
  const [businessAge, setBusinessAge] = useState(() => searchParams.get('business_age_years') ?? '')
  const [employeeCount, setEmployeeCount] = useState(() => searchParams.get('employee_count') ?? '')
  const [annualRevenue] = useState(() => searchParams.get('annual_revenue_krw') ?? '')
  const [creditScore] = useState(() => searchParams.get('credit_score') ?? '')
  const [taxArrears, setTaxArrears] = useState<'yes' | 'no' | ''>(() => {
    const v = searchParams.get('tax_arrears')
    return (v === 'yes' || v === 'no') ? v : ''
  })
  const [showFilters, setShowFilters] = useState(() => {
    return !!(searchParams.get('business_age_years') || searchParams.get('employee_count') || searchParams.get('tax_arrears'))
  })

  const [programs, setPrograms] = useState<ProgramWithEligibility[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [fallbackApplied, setFallbackApplied] = useState<string[]>([])
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null)
  const [searchMode, setSearchMode] = useState<ProgramSearchMode>(() =>
    searchParams.get('search_mode') === 'strict' ? 'strict' : 'relaxed'
  )
  const [industryMatch, setIndustryMatch] = useState<IndustryMatchMode>(() =>
    normalizeIndustryMatchMode(searchParams.get('industry_match'))
  )
  const [responseSearchMode, setResponseSearchMode] = useState<ProgramSearchMode | null>(null)
  const [searchEmptyState, setSearchEmptyState] = useState<SearchEmptyState | null>(null)
  const [requestedFilters, setRequestedFilters] = useState<AppliedFilters | null>(null)
  const LIMIT = 20
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null)
  const [allowsStrictSearch, setAllowsStrictSearch] = useState(false)
  const [includeClosed, setIncludeClosed] = useState(
    () => searchParams.get('include_closed') === '1'
  )
  const [resultSource, setResultSource] = useState<'db' | 'api_fallback' | null>(null)
  const profilePrefillDoneRef = useRef(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/billing/entitlements')
        const data = (await res.json()) as {
          plan?: string
          allows_strict_search?: boolean
          allows_tabular_export?: boolean
        }
        if (res.ok) {
          setAllowsStrictSearch(Boolean(data.allows_strict_search))
        }
      } catch {
        /* 비로그인 등 */
      }
    })()
  }, [])

  useEffect(() => {
    if (hasDefaultBrowseIntent(searchParams) || hasSearchFilterParams(searchParams)) return
    if (profilePrefillDoneRef.current) return
    profilePrefillDoneRef.current = true
    let cancelled = false
    void (async () => {
      const prof = await fetchMyBusinessProfileDefaults()
      if (cancelled || !prof) return
      const url = buildSearchUrlFromProfile(prof)
      if (url) router.replace(url, { scroll: false })
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, router])

  const exportSearchResults = useCallback(
    async (format: 'csv' | 'xlsx') => {
      if (!programs.length) {
        alert('먼저 검색 결과를 불러오세요.')
        return
      }
      setExporting(format)
      try {
        const entRes = await fetch('/api/billing/entitlements')
        if (!entRes.ok) {
          alert('로그인이 필요합니다.')
          return
        }
        const ent = (await entRes.json()) as { allows_tabular_export?: boolean }
        if (!ent.allows_tabular_export) {
          alert('CSV·XLSX 보내기는 Starter 이상 플랜에서 이용할 수 있습니다.')
          return
        }
        const rows = programs.map((pr) => ({
          사업명: stripHtmlToText(pr.title ?? ''),
          주관기관: pr.organization ?? '',
          지역: pr.region ?? '',
          업종: pr.industry ?? '',
          자격판정: eligibilityLabel(pr.eligibility.status),
          적합점수: pr.eligibility.score,
          지원유형: pr.support_type ?? '',
          마감일: pr.application_end_date ?? '',
          공고ID: pr.id,
        }))
        const res = await fetch('/api/export/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format, rows, filenamePrefix: 'search_results' }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          alert(readApiError(j, '보내기에 실패했습니다.'))
          return
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const ext = format === 'csv' ? 'csv' : 'xlsx'
        a.download = `search_results_${new Date().toISOString().slice(0, 10)}.${ext}`
        a.click()
        URL.revokeObjectURL(url)
      } finally {
        setExporting(null)
      }
    },
    [programs]
  )

  const handleSearch = useCallback(async (p = 1, opts?: { mode?: ProgramSearchMode }) => {
    const mode = opts?.mode ?? searchMode
    setSearchMode(mode)
    setLoading(true)
    setSearched(true)
    setSearchError('')
    setSearchEmptyState(null)
    setRequestedFilters(null)
    setFallbackApplied([])
    setAppliedFilters(null)
    try {
      const qs = buildSearchQueryString({
        region,
        city,
        industry,
        keyword,
        supportPurpose,
        businessAge,
        employeeCount,
        taxArrears,
        searchMode: mode,
        industryMatch,
        includeClosed,
      })
      const searchPath = qs ? `/search?${qs}` : '/search'
      router.replace(searchPath, { scroll: false })
      // 검색 단계에서 사용한 조건을 저장해 상세/자격판정 화면에서 자동 채움
      if (typeof window !== 'undefined') {
        localStorage.setItem('pf:last_search_url', searchPath)
        const profileDraft = {
          region: region || undefined,
          city: city || undefined,
          industry: industry || undefined,
          business_age_years: businessAge ? Number(businessAge) : undefined,
          employee_count: employeeCount ? Number(employeeCount) : undefined,
          tax_arrears: taxArrears === 'yes' ? true : taxArrears === 'no' ? false : undefined,
          support_purpose: supportPurpose || undefined,
        }
        localStorage.setItem('pf:last_profile_draft', JSON.stringify(profileDraft))
      }

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: region || undefined,
          city: city || undefined,
          industry: industry || undefined,
          keyword: keyword || undefined,
          business_age_years: businessAge ? Number(businessAge) : undefined,
          employee_count: employeeCount ? Number(employeeCount) : undefined,
          annual_revenue_krw: annualRevenue ? Number(annualRevenue) : undefined,
          credit_score: creditScore ? Number(creditScore) : undefined,
          tax_arrears: taxArrears === 'yes' ? true : taxArrears === 'no' ? false : undefined,
          support_purpose: supportPurpose || undefined,
          search_mode: mode,
          industry_match: industryMatch,
          include_closed: includeClosed,
          page: p,
          limit: LIMIT,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.ok === false) {
        const code = typeof data.error_code === 'string' ? data.error_code : ''
        if (code === 'SEARCH_STRICT_PLAN_REQUIRED' || code === 'AUTH_REQUIRED_FOR_STRICT') {
          setSearchError(readApiError(data, '엄격 검색을 사용할 수 없습니다.'))
          setPrograms([])
          setTotal(0)
          setPage(1)
          setFallbackApplied([])
          return
        }
        if (code === 'SEARCH_QUOTA_EXCEEDED') {
          setSearchError(readApiError(data, '오늘 검색 횟수를 모두 사용했습니다.'))
          setPrograms([])
          setTotal(0)
          setPage(1)
          setFallbackApplied([])
          return
        }
        if (code === 'SEARCH_NO_RESULTS_STRICT') {
          const meta = data.meta as {
            applied_filters?: AppliedFilters
            requested_filters?: AppliedFilters
            empty_state?: SearchEmptyState
          } | undefined
          setRequestedFilters(meta?.requested_filters ?? meta?.applied_filters ?? null)
          setAppliedFilters(meta?.applied_filters ?? null)
          setSearchEmptyState(
            meta?.empty_state ??
              buildSearchEmptyState({
                search_mode: 'strict',
                fallback_applied: [],
                requested_filters: meta?.requested_filters ?? meta?.applied_filters ?? {
                  region: null,
                  city: null,
                  industry: null,
                  keyword: null,
                  support_purpose: null,
                },
                applied_filters: meta?.applied_filters ?? {
                  region: null,
                  city: null,
                  industry: null,
                  keyword: null,
                  support_purpose: null,
                },
              })
          )
          setResponseSearchMode('strict')
          setPrograms([])
          setTotal(0)
          setPage(1)
          setFallbackApplied([])
          return
        }
        setSearchError(readApiError(data, '검색에 실패했습니다. 잠시 후 다시 시도해 주세요.'))
        setPrograms([])
        setTotal(0)
        setPage(1)
        setFallbackApplied([])
        setSearchEmptyState(null)
        return
      }
      setPrograms(data.programs ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
      setResultSource(data.source === 'api_fallback' ? 'api_fallback' : 'db')
      setFallbackApplied(Array.isArray(data.fallback_applied) ? data.fallback_applied : [])
      setRequestedFilters(data.requested_filters ?? null)
      setAppliedFilters(data.applied_filters ?? null)
      setSearchEmptyState(
        (data.total ?? 0) === 0
          ? (data.empty_state as SearchEmptyState | null) ??
              (data.requested_filters && data.applied_filters
                ? buildSearchEmptyState({
                    search_mode:
                      data.search_mode === 'strict' || data.search_mode === 'relaxed'
                        ? data.search_mode
                        : mode,
                    fallback_applied: Array.isArray(data.fallback_applied)
                      ? data.fallback_applied
                      : [],
                    requested_filters: data.requested_filters,
                    applied_filters: data.applied_filters,
                  })
                : null)
          : null
      )
      setResponseSearchMode(
        data.search_mode === 'strict' || data.search_mode === 'relaxed' ? data.search_mode : mode
      )
    } catch {
      setPrograms([])
      setSearchError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [region, city, industry, keyword, supportPurpose, businessAge, employeeCount, annualRevenue, creditScore, taxArrears, searchMode, industryMatch, includeClosed, router])

  const listQueryString = buildSearchQueryString({
    region,
    city,
    industry,
    keyword,
    supportPurpose,
    businessAge,
    employeeCount,
    taxArrears,
    searchMode,
    industryMatch,
    includeClosed,
  })

  const activeSearchMode = responseSearchMode ?? searchMode
  const rawQuery = (searchParams.get('q') || searchParams.get('keyword') || '').trim()
  const parseLowConfidence = readParseLowConfidenceFields()

  // diagnosis·URL 쿼리 진입 시 자동 검색 (빈 화면 깜빡임 방지)
  useLayoutEffect(() => {
    const key = searchParams.toString()
    const shouldAutoSearch =
      hasDefaultBrowseIntent(searchParams) || hasSearchFilterParams(searchParams)
    if (!shouldAutoSearch || autoSearchKeyRef.current === key) return
    if (searchParams.get('include_closed') === '1') {
      setIncludeClosed(true)
    }
    if (searchParams.get('search_mode') === 'strict') {
      setSearchMode('strict')
    }
    const im = searchParams.get('industry_match')
    if (im) setIndustryMatch(normalizeIndustryMatchMode(im))
    autoSearchKeyRef.current = key
    void handleSearch(1)
  }, [searchParams, handleSearch])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 검색 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="공고명, 기관명, 지원내용 검색..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
                className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4" />
              필터
            </button>
            <button
              onClick={() => handleSearch(1)}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              검색
            </button>
          </div>

          {searchError && !searchEmptyState && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {searchError}
            </div>
          )}

          {/* 필터 패널 */}
          {showFilters && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">지역</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체 지역</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">업종</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">전체 업종</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">업력 (년)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="예: 3"
                  value={businessAge}
                  onChange={(e) => setBusinessAge(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">직원 수</label>
                <input
                  type="number"
                  min="0"
                  placeholder="예: 10"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">세금 체납 여부</label>
                <select
                  value={taxArrears}
                  onChange={(e) => setTaxArrears(e.target.value as 'yes' | 'no' | '')}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택 안함</option>
                  <option value="no">없음</option>
                  <option value="yes">있음</option>
                </select>
              </div>
              <div className="col-span-2 md:col-span-3">
                <label className="text-xs font-medium text-gray-600 mb-1 block">업종 매칭 범위</label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="업종 매칭 범위">
                  {(['match', 'similar', 'any'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setIndustryMatch(mode)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        industryMatch === mode
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {INDUSTRY_MATCH_LABELS[mode]}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  일치: 표준 태그·공고문 · 유사: 제목·지원유형 · 전체: 업종 조건 없음
                </p>
              </div>
              <div className="col-span-2 md:col-span-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <input
                  id="include-closed"
                  type="checkbox"
                  checked={includeClosed}
                  onChange={(e) => setIncludeClosed(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="include-closed" className="text-xs text-slate-700 cursor-pointer">
                  마감된 공고 포함 (기본은 모집중·마감임박만 표시)
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        <details className="mb-6 rounded-lg border border-slate-200 bg-white open:shadow-sm">
          <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-slate-800">
            서비스 출처 및 인용 안내 (GEO·면책)
          </summary>
          <div className="border-t px-4 pb-3 pt-2">
            <GeoSourceSummary variant="compact" />
          </div>
        </details>

        {/* 결과 요약 */}
        {searched && !loading && total > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                총 <span className="font-semibold text-gray-900">{total.toLocaleString()}건</span> 검색됨
                {resultSource && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      resultSource === 'db'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}
                    title={
                      resultSource === 'db'
                        ? '등록된 공고 DB에서 조회했습니다.'
                        : 'DB 결과가 적어 외부 API 보조 검색을 포함했습니다.'
                    }
                  >
                    {resultSource === 'db' ? 'DB 검색' : 'API 보조 검색'}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <p className="text-xs text-gray-400">{page}/{totalPages || 1} 페이지</p>
                <FeedbackWidget targetType="search" label="검색 결과가 유용했나요?" />
                <button
                  type="button"
                  onClick={() => void exportSearchResults('csv')}
                  disabled={!!exporting || programs.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {exporting === 'csv' ? '처리중…' : 'CSV'}
                </button>
                <button
                  type="button"
                  onClick={() => void exportSearchResults('xlsx')}
                  disabled={!!exporting || programs.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {exporting === 'xlsx' ? '처리중…' : 'XLSX'}
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-slate-700">실제 검색에 사용된 조건</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    activeSearchMode === 'strict'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {activeSearchMode === 'strict' ? '엄격 검색' : '조건 완화 검색'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {appliedFilters?.region && <FilterChip label="지역" value={appliedFilters.region} />}
                {appliedFilters?.city && <FilterChip label="시·군" value={appliedFilters.city} />}
                {appliedFilters?.industry && <FilterChip label="업종" value={appliedFilters.industry} />}
                {appliedFilters?.industry_match && appliedFilters.industry_match !== 'match' && (
                  <FilterChip
                    label="업종범위"
                    value={INDUSTRY_MATCH_LABELS[appliedFilters.industry_match]}
                  />
                )}
                {appliedFilters?.support_purpose && (
                  <FilterChip label="지원목적" value={appliedFilters.support_purpose} />
                )}
                {appliedFilters?.keyword && <FilterChip label="검색어" value={appliedFilters.keyword} />}
                {appliedFilters?.include_closed && (
                  <FilterChip label="마감" value="포함" />
                )}
                {appliedFilters?.business_age_years != null && (
                  <FilterChip label="업력" value={`${appliedFilters.business_age_years}년`} />
                )}
                {appliedFilters?.employee_count != null && (
                  <FilterChip label="직원" value={`${appliedFilters.employee_count}명`} />
                )}
                {(appliedFilters?.text_terms ?? []).map((t) => (
                  <FilterChip key={t} label="텍스트" value={t} />
                ))}
                {!appliedFilters?.region &&
                  !appliedFilters?.city &&
                  !appliedFilters?.industry &&
                  !appliedFilters?.keyword &&
                  !appliedFilters?.support_purpose &&
                  appliedFilters?.business_age_years == null &&
                  appliedFilters?.employee_count == null &&
                  (appliedFilters?.text_terms ?? []).length === 0 && (
                  <span className="text-xs text-slate-500">추가 필터 없이 전체 공고 풀에서 조회했습니다.</span>
                )}
              </div>
              {appliedFilters?.region && appliedFilters.region !== '전국' && (
                <p className="text-xs text-gray-500">{REGION_FILTER_HINT}</p>
              )}
              {fallbackApplied.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 space-y-2">
                  <p className="text-xs text-amber-800">
                    {fallbackApplied.map((k) => FALLBACK_LABELS[k] ?? k).join(' ')}
                  </p>
                  {allowsStrictSearch ? (
                    <button
                      type="button"
                      onClick={() => void handleSearch(1, { mode: 'strict' })}
                      className="text-xs font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950"
                    >
                      입력 조건 그대로 엄격히 다시 검색
                    </button>
                  ) : (
                    <p className="text-xs text-amber-900/90">
                      엄격 검색은 로그인 후 이용할 수 있습니다.{' '}
                      <Link href="/login" className="font-medium underline">
                        로그인
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="bg-white rounded-xl border p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* 결과 없음 — 공고 없음 vs 조건 해석 문제 구분 */}
        {searched && !loading && programs.length === 0 && searchEmptyState && (
          <SearchEmptyStatePanel
            empty={searchEmptyState}
            requestedFilters={requestedFilters}
            appliedFilters={appliedFilters}
            rawQuery={rawQuery || null}
            lowConfidenceFields={parseLowConfidence}
            allowsStrictSearch={allowsStrictSearch}
            onRelaxedSearch={() => void handleSearch(1, { mode: 'relaxed' })}
            onStrictSearch={() => void handleSearch(1, { mode: 'strict' })}
          />
        )}
        {searched && !loading && programs.length === 0 && !searchEmptyState && (
          <div className="bg-white rounded-xl border p-12 text-center space-y-3">
            <Search className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="text-gray-500">{searchError || '검색 결과를 불러오지 못했습니다.'}</p>
            <p className="text-sm text-gray-400">잠시 후 다시 시도하거나 홈에서 조건을 다시 입력해 보세요.</p>
          </div>
        )}

        {/* 초기 화면 */}
        {!searched && !loading && (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Search className="h-10 w-10 text-blue-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">지원사업을 검색해보세요</p>
            <p className="text-sm text-gray-400 mt-1">키워드, 지역, 업종 등으로 검색하면 자격판정 결과도 함께 표시됩니다.</p>
          </div>
        )}

        {/* 공고 카드 목록 */}
        {!loading && programs.length > 0 && (
          <div className="space-y-3">
            {programs.map((p) => (
              <ProgramCard key={p.id} program={p} listQuery={listQueryString} />
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => handleSearch(page - 1)}
              disabled={page <= 1 || loading}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, page - 2) + i
              if (pageNum > totalPages) return null
              return (
                <button
                  key={pageNum}
                  onClick={() => handleSearch(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    pageNum === page
                      ? 'bg-blue-600 text-white'
                      : 'border hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => handleSearch(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 법적 고지 */}
        {searched && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 leading-relaxed">
              ⚠️ {LEGAL_DISCLAIMER}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProgramCard({
  program: p,
  listQuery,
}: {
  program: ProgramWithEligibility
  listQuery: string
}) {
  const status = p.eligibility?.status ?? 'unknown'
  const colorClass = eligibilityColor(status)
  const label = eligibilityLabel(status)
  const primaryReason = p.eligibility
    ? eligibilityPrimaryReason(p.eligibility, {
        title: p.title,
        region: p.region,
        industry: p.industry,
        industry_tags: p.industry_tags,
        eligibility_text: p.eligibility_text,
        exclusion_text: p.exclusion_text,
        support_type: p.support_type,
      })
    : null

  const isClosingSoon = p.days_left !== null && p.days_left !== undefined && p.days_left <= 7 && p.days_left >= 0
  const isClosed = p.days_left !== null && p.days_left !== undefined && p.days_left < 0

  const returnSuffix = listQuery ? `?return=${encodeURIComponent(`?${listQuery}`)}` : ''
  const detailHref = `/search/${p.id}${returnSuffix}`

  return (
    <Link
      href={detailHref}
      className="block bg-white rounded-xl border hover:border-blue-300 hover:shadow-md transition-all p-5 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {/* 자격판정 배지 */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
              {label}
            </span>
            {/* 마감 배지 */}
            {isClosed && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                마감
              </span>
            )}
            {isClosingSoon && !isClosed && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {p.days_left === 0 ? '오늘 마감' : `D-${p.days_left}`}
              </span>
            )}
            {p.source && (
              <span className="text-xs text-gray-400">
                {p.source === 'bizinfo' ? '기업마당' : p.source === 'kstartup' ? 'K-Startup' : '중소벤처24'}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
            {stripHtmlToText(p.title)}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {p.organization && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {stripHtmlToText(p.organization)}
              </span>
            )}
            {p.region && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {stripHtmlToText(p.region)}
              </span>
            )}
            {p.application_end_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {p.application_end_date} 마감
              </span>
            )}
          </div>
          {p.support_type && (
            <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">
              {stripHtmlToText(p.support_type, { maxLength: 220 })}
            </p>
          )}
        </div>
        <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
      </div>

      {primaryReason && (
        <div className="mt-3 pt-3 border-t border-dashed">
          <p className="text-xs text-gray-600">
            <span className="font-medium text-gray-700">판정 사유: </span>
            {primaryReason}
            {(p.eligibility?.failed.length ?? 0) > 1 && ` (외 ${p.eligibility!.failed.length - 1}건)`}
          </p>
        </div>
      )}
    </Link>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">로딩 중...</div></div>}>
      <SearchContent />
    </Suspense>
  )
}
