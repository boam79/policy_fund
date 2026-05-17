'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toCanonicalIndustry } from '@/lib/industry/canonical'

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']
const INDUSTRIES = ['제조업', '서비스업', 'IT/소프트웨어', '유통/도소매', '음식/외식', '건설업', '기타']

type Props = {
  onKeywordSearch?: (keyword: string) => void
  lastQuery?: string
}

/** parse 400(입력 검증 실패) 시 지역·업종·업력 3필드로 /search 이동 */
export default function ParseFallbackMiniForm({ onKeywordSearch, lastQuery = '' }: Props) {
  const router = useRouter()
  const [region, setRegion] = useState('')
  const [industry, setIndustry] = useState('')
  const [businessAge, setBusinessAge] = useState('')

  function goSearch() {
    const params = new URLSearchParams()
    if (region) params.set('region', region)
    if (industry) params.set('industry', toCanonicalIndustry(industry))
    if (businessAge.trim()) params.set('business_age_years', businessAge.trim())
    const qs = params.toString()
    router.push(qs ? `/search?${qs}` : '/search')
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 space-y-3">
      <p className="text-sm font-medium text-amber-900">
        조건을 직접 선택해 공고를 검색할 수 있습니다
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block text-xs text-amber-900/80">
          지역
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm"
          >
            <option value="">선택</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-amber-900/80">
          업종
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm"
          >
            <option value="">선택</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-amber-900/80">
          업력 (년)
          <input
            type="number"
            min={0}
            max={100}
            value={businessAge}
            onChange={(e) => setBusinessAge(e.target.value)}
            placeholder="예: 3"
            className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={goSearch} className={cn(buttonVariants({ size: 'sm' }))}>
          조건으로 공고 검색
        </button>
        {lastQuery.trim() && onKeywordSearch && (
          <button
            type="button"
            onClick={() => onKeywordSearch(lastQuery.trim())}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            입력 문장으로 키워드 검색
          </button>
        )}
      </div>
    </div>
  )
}
