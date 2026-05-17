'use client'

import { Search } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import { getDiagnosisConditionValue } from '@/lib/diagnosis/coerce'
import { toCanonicalIndustry } from '@/lib/industry/canonical'

const CHIP_KEYS = ['region', 'industry', 'business_age_years'] as const

const CHIP_LABELS: Record<(typeof CHIP_KEYS)[number], string> = {
  region: '지역',
  industry: '업종',
  business_age_years: '업력',
}

function chipText(
  key: (typeof CHIP_KEYS)[number],
  parsed: ParseNLResult,
  editValues: Record<string, string>
): string | null {
  const v = getDiagnosisConditionValue(parsed, editValues, key)
  if (v == null || v === '') return null
  if (key === 'business_age_years') return `${v}년`
  if (key === 'industry') return toCanonicalIndustry(String(v))
  return String(v)
}

type Props = {
  parsed: ParseNLResult
  editValues: Record<string, string>
  onSearch: () => void
}

export default function DiagnosisConfirmChips({ parsed, editValues, onSearch }: Props) {
  const chips = CHIP_KEYS.map((key) => ({
    key,
    label: CHIP_LABELS[key],
    value: chipText(key, parsed, editValues),
  })).filter((c) => c.value)

  if (chips.length === 0) return null

  return (
    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/60 p-4 space-y-3">
      <p className="text-sm font-medium text-blue-900">이 조건으로 바로 검색할 수 있습니다</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c.key}
            className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-900"
          >
            {c.label}: {c.value}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={onSearch}
        className={cn(buttonVariants(), 'w-full sm:w-auto gap-2')}
      >
        <Search className="h-4 w-4" />
        이대로 실제 공고 검색
      </button>
    </div>
  )
}
