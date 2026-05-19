'use client'

import { INDUSTRY_MATCH_LABELS, type IndustryMatchMode } from '@/lib/gov-support/tools/industryMatch'
import { INDUSTRY_FILTER_OPTIONS } from '@/lib/industry/options'
import { SEARCH_REGION_OPTIONS } from '@/lib/geo/regions'

export type SearchFiltersState = {
  region: string
  industry: string
  businessAge: string
  employeeCount: string
  taxArrears: 'yes' | 'no' | ''
  industryMatch: IndustryMatchMode
  includeClosed: boolean
}

type Props = SearchFiltersState & {
  onRegionChange: (v: string) => void
  onIndustryChange: (v: string) => void
  onBusinessAgeChange: (v: string) => void
  onEmployeeCountChange: (v: string) => void
  onTaxArrearsChange: (v: 'yes' | 'no' | '') => void
  onIndustryMatchChange: (v: IndustryMatchMode) => void
  onIncludeClosedChange: (v: boolean) => void
}

export default function SearchFiltersPanel({
  region,
  industry,
  businessAge,
  employeeCount,
  taxArrears,
  industryMatch,
  includeClosed,
  onRegionChange,
  onIndustryChange,
  onBusinessAgeChange,
  onEmployeeCountChange,
  onTaxArrearsChange,
  onIndustryMatchChange,
  onIncludeClosedChange,
}: Props) {
  return (
    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">지역</label>
        <select
          value={region}
          onChange={(e) => onRegionChange(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 지역</option>
          {SEARCH_REGION_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">업종</label>
        <select
          value={industry}
          onChange={(e) => onIndustryChange(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 업종</option>
          {INDUSTRY_FILTER_OPTIONS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">업력 (년)</label>
        <input
          type="number"
          min="0"
          placeholder="예: 3"
          value={businessAge}
          onChange={(e) => onBusinessAgeChange(e.target.value)}
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
          onChange={(e) => onEmployeeCountChange(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">세금 체납 여부</label>
        <select
          value={taxArrears}
          onChange={(e) => onTaxArrearsChange(e.target.value as 'yes' | 'no' | '')}
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
              onClick={() => onIndustryMatchChange(mode)}
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
          onChange={(e) => onIncludeClosedChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="include-closed" className="text-xs text-slate-700 cursor-pointer">
          마감된 공고 포함 (기본은 모집중·마감임박만 표시)
        </label>
      </div>
    </div>
  )
}
