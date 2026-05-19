'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ProgramSearchMode } from '@/lib/gov-support/tools/runProgramSearch'
import {
  normalizeIndustryMatchMode,
  type IndustryMatchMode,
} from '@/lib/gov-support/tools/industryMatch'
import type { EligibilityStatus } from '@/lib/gov-support/tools/eligibility'
import type { SupportProgram } from '@/lib/gov-support/tools/unifiedSearch'
import { readApiError } from '@/lib/api/readApiError'
import { fetchMyBusinessProfileDefaults } from '@/lib/profile/fetch-my-business-profile'
import { buildSearchUrlFromProfile } from '@/lib/profile/business-profile-defaults'
import type { SearchEmptyState, SearchFilterSnapshot } from '@/lib/search/emptyResult'
import { buildSearchEmptyState } from '@/lib/search/emptyResult'
import { hasDefaultBrowseIntent, hasSearchFilterParams } from '@/lib/search/browse'
import { buildSearchQueryString, parseSearchParams } from '@/lib/search/queryParams'
import type { SearchProgramWithEligibility } from '@/components/search/SearchProgramCard'

type AppliedFilters = SearchFilterSnapshot & { text_terms?: string[] }

interface EligibilityResult {
  status: EligibilityStatus
  score: number
  passed: string[]
  failed: string[]
  unknown: string[]
}

const LIMIT = 20

export function useSearchPageState() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoSearchKeyRef = useRef('')
  const profilePrefillDoneRef = useRef(false)

  const initial = parseSearchParams(searchParams)

  const [region, setRegion] = useState(initial.region)
  const [city] = useState(initial.city)
  const [industry, setIndustry] = useState(initial.industry)
  const [keyword, setKeyword] = useState(initial.keyword)
  const [supportPurpose] = useState(initial.supportPurpose)
  const [businessAge, setBusinessAge] = useState(initial.businessAge)
  const [employeeCount, setEmployeeCount] = useState(initial.employeeCount)
  const [annualRevenue] = useState(initial.annualRevenue)
  const [creditScore] = useState(initial.creditScore)
  const [taxArrears, setTaxArrears] = useState(initial.taxArrears)
  const [showFilters, setShowFilters] = useState(
    () =>
      !!(
        searchParams.get('business_age_years') ||
        searchParams.get('employee_count') ||
        searchParams.get('tax_arrears')
      )
  )

  const [programs, setPrograms] = useState<SearchProgramWithEligibility[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [fallbackApplied, setFallbackApplied] = useState<string[]>([])
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null)
  const [searchMode, setSearchMode] = useState<ProgramSearchMode>(initial.searchMode)
  const [industryMatch, setIndustryMatch] = useState<IndustryMatchMode>(initial.industryMatch)
  const [responseSearchMode, setResponseSearchMode] = useState<ProgramSearchMode | null>(null)
  const [searchEmptyState, setSearchEmptyState] = useState<SearchEmptyState | null>(null)
  const [requestedFilters, setRequestedFilters] = useState<AppliedFilters | null>(null)
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null)
  const [allowsStrictSearch, setAllowsStrictSearch] = useState(false)
  const [includeClosed, setIncludeClosed] = useState(initial.includeClosed)
  const [resultSource, setResultSource] = useState<'db' | 'api_fallback' | null>(null)

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

  const handleSearch = useCallback(
    async (p = 1, opts?: { mode?: ProgramSearchMode }) => {
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

        const data = (await res.json()) as {
          ok?: boolean
          programs?: (SupportProgram & { eligibility: EligibilityResult; days_left: number | null })[]
          total?: number
          fallback_applied?: string[]
          requested_filters?: AppliedFilters
          applied_filters?: AppliedFilters
          empty_state?: SearchEmptyState
          search_mode?: ProgramSearchMode
          source?: string
          error?: string
        }

        if (!res.ok || data.ok === false) {
          if (res.status === 429) {
            setSearchError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.')
            setPrograms([])
            setTotal(0)
            setPage(1)
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
        setPrograms((data.programs ?? []) as SearchProgramWithEligibility[])
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
    },
    [
      region,
      city,
      industry,
      keyword,
      supportPurpose,
      businessAge,
      employeeCount,
      annualRevenue,
      creditScore,
      taxArrears,
      searchMode,
      industryMatch,
      includeClosed,
      router,
    ]
  )

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
  const totalPages = Math.ceil(total / LIMIT)

  return {
    region,
    setRegion,
    city,
    industry,
    setIndustry,
    keyword,
    setKeyword,
    supportPurpose,
    businessAge,
    setBusinessAge,
    employeeCount,
    setEmployeeCount,
    annualRevenue,
    creditScore,
    taxArrears,
    setTaxArrears,
    showFilters,
    setShowFilters,
    programs,
    total,
    page,
    loading,
    searched,
    searchError,
    fallbackApplied,
    appliedFilters,
    searchMode,
    setSearchMode,
    industryMatch,
    setIndustryMatch,
    activeSearchMode,
    searchEmptyState,
    requestedFilters,
    exporting,
    setExporting,
    allowsStrictSearch,
    includeClosed,
    setIncludeClosed,
    resultSource,
    handleSearch,
    listQueryString,
    totalPages,
    limit: LIMIT,
    searchParams,
  }
}
