'use client'

import { useCallback, Suspense } from 'react'
import Link from 'next/link'
import { Search, Filter, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import FeedbackWidget from '@/components/FeedbackWidget'
import { eligibilityLabel } from '@/lib/gov-support/tools/eligibility'
import { INDUSTRY_MATCH_LABELS } from '@/lib/gov-support/tools/industryMatch'
import { readApiError } from '@/lib/api/readApiError'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import GeoSourceSummary from '@/components/geo/GeoSourceSummary'
import SearchEmptyStatePanel from '@/components/search/SearchEmptyState'
import SearchFiltersPanel from '@/components/search/SearchFiltersPanel'
import SearchProgramCard from '@/components/search/SearchProgramCard'
import { lowConfidenceFieldKeys } from '@/lib/search/emptyResult'
import { useSearchPageState } from '@/hooks/useSearchPageState'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'

const LEGAL_DISCLAIMER =
  '본 자격판정 결과는 AI 기반 참고 정보이며 법적 효력이 없습니다. 실제 신청 가능 여부는 해당 지원기관의 공식 공고문을 반드시 확인하세요.'

const FALLBACK_LABELS: Record<string, string> = {
  drop_keyword: '검색어·지원목적 조건을 완화했습니다.',
  drop_city: '시·군 조건을 완화했습니다.',
  drop_industry: '업종 조건을 완화했습니다.',
}

const REGION_FILTER_HINT =
  '선택한 지역·전국 단위 공고만 표시합니다. 지역 미기재 공고는 제외됩니다.'

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

function FilterChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-800">
      {label}: {value}
    </span>
  )
}

function SearchContent() {
  const s = useSearchPageState()
  const rawQuery = (s.searchParams.get('q') || s.searchParams.get('keyword') || '').trim()
  const parseLowConfidence = readParseLowConfidenceFields()

  const exportSearchResults = useCallback(
    async (format: 'csv' | 'xlsx') => {
      if (!s.programs.length) {
        alert('먼저 검색 결과를 불러오세요.')
        return
      }
      s.setExporting(format)
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
        const rows = s.programs.map((pr) => ({
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
        s.setExporting(null)
      }
    },
    [s]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="공고명, 기관명, 지원내용 검색..."
                value={s.keyword}
                onChange={(e) => s.setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && s.handleSearch(1)}
                className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => s.setShowFilters(!s.showFilters)}
              className="flex items-center gap-1.5 px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4" />
              필터
            </button>
            <button
              onClick={() => s.handleSearch(1)}
              disabled={s.loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              검색
            </button>
          </div>

          {s.searchError && !s.searchEmptyState && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {s.searchError}
            </div>
          )}

          {s.showFilters && (
            <SearchFiltersPanel
              region={s.region}
              industry={s.industry}
              businessAge={s.businessAge}
              employeeCount={s.employeeCount}
              taxArrears={s.taxArrears}
              industryMatch={s.industryMatch}
              includeClosed={s.includeClosed}
              onRegionChange={s.setRegion}
              onIndustryChange={s.setIndustry}
              onBusinessAgeChange={s.setBusinessAge}
              onEmployeeCountChange={s.setEmployeeCount}
              onTaxArrearsChange={s.setTaxArrears}
              onIndustryMatchChange={s.setIndustryMatch}
              onIncludeClosedChange={s.setIncludeClosed}
            />
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

        {s.searched && !s.loading && s.total > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                총 <span className="font-semibold text-gray-900">{s.total.toLocaleString()}건</span> 검색됨
                {s.resultSource && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.resultSource === 'db'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}
                  >
                    {s.resultSource === 'db' ? 'DB 검색' : 'API 보조 검색'}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <p className="text-xs text-gray-400">
                  {s.page}/{s.totalPages || 1} 페이지
                </p>
                <FeedbackWidget targetType="search" label="검색 결과가 유용했나요?" />
                <button
                  type="button"
                  onClick={() => void exportSearchResults('csv')}
                  disabled={!!s.exporting || s.programs.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {s.exporting === 'csv' ? '처리중…' : 'CSV'}
                </button>
                <button
                  type="button"
                  onClick={() => void exportSearchResults('xlsx')}
                  disabled={!!s.exporting || s.programs.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {s.exporting === 'xlsx' ? '처리중…' : 'XLSX'}
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-slate-700">실제 검색에 사용된 조건</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.activeSearchMode === 'strict'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {s.activeSearchMode === 'strict' ? '엄격 검색' : '조건 완화 검색'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.appliedFilters?.region && <FilterChip label="지역" value={s.appliedFilters.region} />}
                {s.appliedFilters?.city && <FilterChip label="시·군" value={s.appliedFilters.city} />}
                {s.appliedFilters?.industry && <FilterChip label="업종" value={s.appliedFilters.industry} />}
                {s.appliedFilters?.industry_match && s.appliedFilters.industry_match !== 'match' && (
                  <FilterChip
                    label="업종범위"
                    value={INDUSTRY_MATCH_LABELS[s.appliedFilters.industry_match]}
                  />
                )}
                {s.appliedFilters?.support_purpose && (
                  <FilterChip label="지원목적" value={s.appliedFilters.support_purpose} />
                )}
                {s.appliedFilters?.keyword && <FilterChip label="검색어" value={s.appliedFilters.keyword} />}
                {s.appliedFilters?.include_closed && <FilterChip label="마감" value="포함" />}
                {s.appliedFilters?.business_age_years != null && (
                  <FilterChip label="업력" value={`${s.appliedFilters.business_age_years}년`} />
                )}
                {s.appliedFilters?.employee_count != null && (
                  <FilterChip label="직원" value={`${s.appliedFilters.employee_count}명`} />
                )}
                {(s.appliedFilters?.text_terms ?? []).map((t) => (
                  <FilterChip key={t} label="텍스트" value={t} />
                ))}
                {!s.appliedFilters?.region &&
                  !s.appliedFilters?.city &&
                  !s.appliedFilters?.industry &&
                  !s.appliedFilters?.keyword &&
                  !s.appliedFilters?.support_purpose &&
                  s.appliedFilters?.business_age_years == null &&
                  s.appliedFilters?.employee_count == null &&
                  (s.appliedFilters?.text_terms ?? []).length === 0 && (
                    <span className="text-xs text-slate-500">
                      추가 필터 없이 전체 공고 풀에서 조회했습니다.
                    </span>
                  )}
              </div>
              {s.appliedFilters?.region && s.appliedFilters.region !== '전국' && (
                <p className="text-xs text-gray-500">{REGION_FILTER_HINT}</p>
              )}
              {s.fallbackApplied.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 space-y-2">
                  <p className="text-xs text-amber-800">
                    {s.fallbackApplied.map((k) => FALLBACK_LABELS[k] ?? k).join(' ')}
                  </p>
                  {s.allowsStrictSearch ? (
                    <button
                      type="button"
                      onClick={() => void s.handleSearch(1, { mode: 'strict' })}
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

        {s.loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-xl border p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {s.searched && !s.loading && s.programs.length === 0 && s.searchEmptyState && (
          <SearchEmptyStatePanel
            empty={s.searchEmptyState}
            requestedFilters={s.requestedFilters}
            appliedFilters={s.appliedFilters}
            rawQuery={rawQuery || null}
            lowConfidenceFields={parseLowConfidence}
            allowsStrictSearch={s.allowsStrictSearch}
            onRelaxedSearch={() => void s.handleSearch(1, { mode: 'relaxed' })}
            onStrictSearch={() => void s.handleSearch(1, { mode: 'strict' })}
          />
        )}
        {s.searched && !s.loading && s.programs.length === 0 && !s.searchEmptyState && (
          <div className="bg-white rounded-xl border p-12 text-center space-y-3">
            <Search className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="text-gray-500">{s.searchError || '검색 결과를 불러오지 못했습니다.'}</p>
            <p className="text-sm text-gray-400">잠시 후 다시 시도하거나 홈에서 조건을 다시 입력해 보세요.</p>
          </div>
        )}

        {!s.searched && !s.loading && (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Search className="h-10 w-10 text-blue-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">지원사업을 검색해보세요</p>
            <p className="text-sm text-gray-400 mt-1">
              키워드, 지역, 업종 등으로 검색하면 자격판정 결과도 함께 표시됩니다.
            </p>
          </div>
        )}

        {!s.loading && s.programs.length > 0 && (
          <div className="space-y-3">
            {s.programs.map((p) => (
              <SearchProgramCard key={p.id} program={p} listQuery={s.listQueryString} />
            ))}
          </div>
        )}

        {s.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => s.handleSearch(s.page - 1)}
              disabled={s.page <= 1 || s.loading}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, s.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, s.page - 2) + i
              if (pageNum > s.totalPages) return null
              return (
                <button
                  key={pageNum}
                  onClick={() => s.handleSearch(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    pageNum === s.page
                      ? 'bg-blue-600 text-white'
                      : 'border hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => s.handleSearch(s.page + 1)}
              disabled={s.page >= s.totalPages || s.loading}
              className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {s.searched && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 leading-relaxed">⚠️ {LEGAL_DISCLAIMER}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-400">로딩 중...</div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
