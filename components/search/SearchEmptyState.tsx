'use client'

import Link from 'next/link'
import { Search, AlertCircle, FileSearch, ArrowLeft } from 'lucide-react'
import type { SearchEmptyState as EmptyStateModel } from '@/lib/search/emptyResult'
import type { SearchFilterSnapshot } from '@/lib/search/emptyResult'
import { INDUSTRY_MATCH_LABELS } from '@/lib/gov-support/tools/industryMatch'

function FilterChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-800">
      {label}: {value}
    </span>
  )
}

function FilterList({
  title,
  filters,
}: {
  title: string
  filters: SearchFilterSnapshot | null
}) {
  if (!filters) return null
  const chips: { label: string; value: string }[] = []
  if (filters.region) chips.push({ label: '지역', value: filters.region })
  if (filters.city) chips.push({ label: '시·군', value: filters.city })
  if (filters.industry) chips.push({ label: '업종', value: filters.industry })
  if (filters.industry_match && filters.industry_match !== 'match') {
    chips.push({ label: '업종범위', value: INDUSTRY_MATCH_LABELS[filters.industry_match] })
  }
  if (filters.support_purpose) chips.push({ label: '지원목적', value: filters.support_purpose })
  if (filters.keyword) chips.push({ label: '검색어', value: filters.keyword })
  if (filters.business_age_years != null) {
    chips.push({ label: '업력', value: `${filters.business_age_years}년` })
  }
  if (filters.employee_count != null) {
    chips.push({ label: '직원', value: `${filters.employee_count}명` })
  }
  ;(filters.text_terms ?? []).forEach((t) => chips.push({ label: '텍스트', value: t }))

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left">
      <p className="text-xs font-medium text-slate-700 mb-1.5">{title}</p>
      {chips.length === 0 ? (
        <p className="text-xs text-slate-500">추가 필터 없음</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <FilterChip key={`${c.label}-${c.value}`} label={c.label} value={c.value} />
          ))}
        </div>
      )}
    </div>
  )
}

export interface SearchEmptyStateProps {
  empty: EmptyStateModel
  requestedFilters: SearchFilterSnapshot | null
  appliedFilters: SearchFilterSnapshot | null
  rawQuery?: string | null
  lowConfidenceFields?: string[]
  onRelaxedSearch?: () => void
  onStrictSearch?: () => void
  allowsStrictSearch?: boolean
}

const FIELD_LABELS: Record<string, string> = {
  region: '지역',
  industry: '업종',
  business_age_years: '업력',
  employee_count: '직원 수',
}

export default function SearchEmptyState({
  empty,
  requestedFilters,
  appliedFilters,
  rawQuery,
  lowConfidenceFields = [],
  onRelaxedSearch,
  onStrictSearch,
  allowsStrictSearch = false,
}: SearchEmptyStateProps) {
  const showDualFilters = empty.filtersRelaxed && requestedFilters && appliedFilters

  return (
    <div className="bg-white rounded-xl border p-8 sm:p-10 text-center space-y-5">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        {empty.kind === 'relaxed_zero_bare' ? (
          <AlertCircle className="h-6 w-6 text-amber-600" />
        ) : (
          <FileSearch className="h-6 w-6 text-slate-500" />
        )}
      </div>

      <div className="space-y-2 max-w-lg mx-auto">
        <h2 className="text-lg font-semibold text-gray-900">{empty.title}</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{empty.description}</p>
      </div>

      {rawQuery?.trim() && (
        <div className="mx-auto max-w-md rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-left">
          <p className="text-xs font-medium text-blue-900">입력한 질문</p>
          <p className="mt-1 text-sm text-blue-950">&ldquo;{rawQuery.trim()}&rdquo;</p>
        </div>
      )}

      {showDualFilters && (
        <div className="mx-auto max-w-xl grid gap-3 sm:grid-cols-2 text-left">
          <FilterList title="처음 입력·추출한 조건" filters={requestedFilters} />
          <FilterList title="실제로 검색에 사용된 조건" filters={appliedFilters} />
        </div>
      )}

      {!showDualFilters && requestedFilters && (
        <div className="mx-auto max-w-md">
          <FilterList title="검색에 사용한 조건" filters={requestedFilters} />
        </div>
      )}

      {(empty.checkConditionsHint || lowConfidenceFields.length > 0) && (
        <div className="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left space-y-2">
          <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            조건 해석·입력 확인
          </p>
          {empty.checkConditionsHint && (
            <p className="text-xs text-amber-900/90 leading-relaxed">{empty.checkConditionsHint}</p>
          )}
          {lowConfidenceFields.length > 0 && (
            <p className="text-xs text-amber-800">
              AI가 확신하지 못한 항목:{' '}
              {lowConfidenceFields.map((k) => FIELD_LABELS[k] ?? k).join(', ')}
            </p>
          )}
          <Link
            href={rawQuery ? `/diagnosis?q=${encodeURIComponent(rawQuery)}` : '/diagnosis'}
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-950 underline underline-offset-2"
          >
            <ArrowLeft className="h-3 w-3" />
            진단에서 조건 수정하기
          </Link>
        </div>
      )}

      {empty.dataHint && (
        <p className="text-xs text-gray-500 max-w-md mx-auto">{empty.dataHint}</p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        {empty.kind === 'strict_zero' && onRelaxedSearch && (
          <button
            type="button"
            onClick={onRelaxedSearch}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            조건 완화 검색으로 다시 찾기
          </button>
        )}
        {empty.kind !== 'strict_zero' && allowsStrictSearch && onStrictSearch && (
          <button
            type="button"
            onClick={onStrictSearch}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            입력 조건 그대로 엄격 검색
          </button>
        )}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <Search className="h-4 w-4" />
          홈에서 다시 검색
        </Link>
      </div>
    </div>
  )
}
