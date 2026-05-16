'use client'

import { useState, useCallback, useEffect, useLayoutEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, Building2, MapPin, Calendar, ExternalLink, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import FeedbackWidget from '@/components/FeedbackWidget'
import { eligibilityLabel, eligibilityColor, type EligibilityStatus } from '@/lib/gov-support/tools/eligibility'
import type { SupportProgram } from '@/lib/gov-support/tools/unifiedSearch'
import { readApiError } from '@/lib/api/readApiError'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import GeoSourceSummary from '@/components/geo/GeoSourceSummary'
import { toCanonicalIndustry } from '@/lib/industry/canonical'

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

interface AppliedFilters {
  region: string | null
  city: string | null
  industry: string | null
  keyword: string | null
  support_purpose: string | null
  text_terms: string[]
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
}): string {
  const params = new URLSearchParams()
  if (input.region) params.set('region', input.region)
  if (input.city) params.set('city', input.city)
  if (input.industry) params.set('industry', input.industry)
  if (input.supportPurpose) params.set('support_purpose', input.supportPurpose)
  if (input.keyword.trim()) params.set('keyword', input.keyword.trim())
  if (input.businessAge) params.set('business_age_years', input.businessAge)
  if (input.employeeCount) params.set('employee_count', input.employeeCount)
  if (input.taxArrears) params.set('tax_arrears', input.taxArrears)
  return params.toString()
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
  const LIMIT = 20
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null)

  const exportSearchResults = useCallback(
    async (format: 'csv' | 'xlsx') => {
      if (!programs.length) {
        alert('먼저 검색 결과를 불러오세요.')
        return
      }
      setExporting(format)
      try {
        const subRes = await fetch('/api/billing/subscription')
        if (!subRes.ok) {
          alert('로그인이 필요합니다.')
          return
        }
        const subJson = (await subRes.json()) as { subscription?: { plan?: string } }
        const plan = subJson.subscription?.plan ?? 'free'
        if (plan !== 'starter' && plan !== 'pro') {
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

  const handleSearch = useCallback(async (p = 1) => {
    setLoading(true)
    setSearched(true)
    setSearchError('')
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
          page: p,
          limit: LIMIT,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.ok === false) {
        setSearchError(readApiError(data, '검색에 실패했습니다. 잠시 후 다시 시도해 주세요.'))
        setPrograms([])
        setTotal(0)
        setPage(1)
        return
      }
      setPrograms(data.programs ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
      setFallbackApplied(Array.isArray(data.fallback_applied) ? data.fallback_applied : [])
      setAppliedFilters(data.applied_filters ?? null)
    } catch {
      setPrograms([])
      setSearchError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [region, city, industry, keyword, supportPurpose, businessAge, employeeCount, annualRevenue, creditScore, taxArrears, router])

  const listQueryString = buildSearchQueryString({
    region,
    city,
    industry,
    keyword,
    supportPurpose,
    businessAge,
    employeeCount,
    taxArrears,
  })

  // diagnosis·URL 쿼리 진입 시 자동 검색 (빈 화면 깜빡임 방지)
  useLayoutEffect(() => {
    const key = searchParams.toString()
    const hasParams =
      searchParams.get('region') ||
      searchParams.get('industry') ||
      searchParams.get('keyword') ||
      searchParams.get('q') ||
      searchParams.get('support_purpose') ||
      searchParams.get('business_age_years') ||
      searchParams.get('employee_count') ||
      searchParams.get('tax_arrears')
    if (!hasParams || autoSearchKeyRef.current === key) return
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

          {searchError && (
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
        {searched && !loading && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-gray-600">
                총 <span className="font-semibold text-gray-900">{total.toLocaleString()}건</span> 검색됨
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
            {(appliedFilters?.region || appliedFilters?.city || appliedFilters?.industry ||
              appliedFilters?.keyword || appliedFilters?.support_purpose) && (
              <div className="flex flex-wrap gap-1.5">
                {appliedFilters?.region && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-800">지역: {appliedFilters.region}</span>
                )}
                {appliedFilters?.city && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-800">시·군: {appliedFilters.city}</span>
                )}
                {appliedFilters?.industry && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-800">업종: {appliedFilters.industry}</span>
                )}
                {appliedFilters?.support_purpose && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-800">지원목적: {appliedFilters.support_purpose}</span>
                )}
                {appliedFilters?.keyword && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-800">검색어: {appliedFilters.keyword}</span>
                )}
              </div>
            )}
            {appliedFilters?.region && appliedFilters.region !== '전국' && (
              <p className="text-xs text-gray-500">{REGION_FILTER_HINT}</p>
            )}
            {fallbackApplied.length > 0 && (
              <p className="text-xs text-amber-700">
                {fallbackApplied.map((k) => FALLBACK_LABELS[k] ?? k).join(' ')}
              </p>
            )}
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

        {/* 결과 없음 */}
        {searched && !loading && programs.length === 0 && (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">검색 결과가 없습니다.</p>
            <p className="text-sm text-gray-400 mt-1">조건을 변경하거나 키워드를 수정해보세요.</p>
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
                D-{p.days_left}
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

      {/* 자격판정 세부 (실패 조건이 있을 때만) */}
      {p.eligibility?.failed?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dashed">
          <p className="text-xs text-gray-500">
            ⚠️ {p.eligibility.failed[0]}
            {p.eligibility.failed.length > 1 && ` 외 ${p.eligibility.failed.length - 1}건`}
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
