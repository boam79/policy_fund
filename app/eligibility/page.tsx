'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'

type EligibilityResponse = {
  ok: boolean
  program_id: string
  status: 'likely_eligible' | 'review_needed' | 'likely_ineligible' | 'unknown'
  label: string
  score: number
  passed: string[]
  failed: string[]
  unknown: string[]
  explanation?: string
}

type ProfileDraft = {
  region?: string
  city?: string
  industry?: string
  business_age_years?: number
  employee_count?: number
  tax_arrears?: boolean
  support_purpose?: string
}

function pickString(searchParams: URLSearchParams, key: string): string {
  const value = searchParams.get(key)?.trim() ?? ''
  return value
}

function pickNumber(searchParams: URLSearchParams, key: string): string {
  const raw = searchParams.get(key)?.trim() ?? ''
  if (!raw) return ''
  const num = Number(raw)
  return Number.isFinite(num) ? String(num) : ''
}

function EligibilityContent() {
  const searchParams = useSearchParams()
  const programId = searchParams.get('program_id') ?? ''

  const [region, setRegion] = useState(() => pickString(searchParams, 'region'))
  const [city, setCity] = useState(() => pickString(searchParams, 'city'))
  const [industry, setIndustry] = useState(() => pickString(searchParams, 'industry'))
  const [businessAgeYears, setBusinessAgeYears] = useState(() => pickNumber(searchParams, 'business_age_years'))
  const [employeeCount, setEmployeeCount] = useState(() => pickNumber(searchParams, 'employee_count'))
  const [taxArrears, setTaxArrears] = useState<'yes' | 'no' | ''>(() => {
    const v = searchParams.get('tax_arrears')
    return v === 'yes' || v === 'no' ? v : ''
  })
  const [supportPurpose, setSupportPurpose] = useState(() => pickString(searchParams, 'support_purpose'))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<EligibilityResponse | null>(null)

  const scoreColor = useMemo(() => {
    if (!result) return 'text-gray-700'
    if (result.score >= 80) return 'text-green-600'
    if (result.score >= 60) return 'text-blue-600'
    if (result.score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }, [result])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const currentHasAnyValue = Boolean(
      region || city || industry || businessAgeYears || employeeCount || taxArrears || supportPurpose
    )
    if (currentHasAnyValue) return

    const applyDraft = (draft: ProfileDraft) => {
      if (draft.region) setRegion(draft.region)
      if (draft.city) setCity(draft.city)
      if (draft.industry) setIndustry(draft.industry)
      if (typeof draft.business_age_years === 'number') setBusinessAgeYears(String(draft.business_age_years))
      if (typeof draft.employee_count === 'number') setEmployeeCount(String(draft.employee_count))
      if (typeof draft.tax_arrears === 'boolean') setTaxArrears(draft.tax_arrears ? 'yes' : 'no')
      if (draft.support_purpose) setSupportPurpose(draft.support_purpose)
    }

    // 1) 진단/검색 단계에서 저장한 최신 draft 우선 사용
    const draftRaw = localStorage.getItem('pf:last_profile_draft')
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw) as ProfileDraft
        applyDraft(draft)
        return
      } catch {
        // ignore parse error
      }
    }

    // 2) 홈 검색의 parsed 결과를 fallback으로 사용
    const parsedRaw = localStorage.getItem('pf:last_parsed')
    if (!parsedRaw) return
    try {
      const parsed = JSON.parse(parsedRaw) as ParseNLResult
      const c = parsed.conditions
      const draft: ProfileDraft = {
        region: c.region?.value,
        city: c.city?.value,
        industry: c.industry?.value,
        business_age_years: typeof c.business_age_years?.value === 'number' ? c.business_age_years.value : undefined,
        employee_count: typeof c.employee_count?.value === 'number' ? c.employee_count.value : undefined,
        tax_arrears: typeof c.tax_arrears?.value === 'boolean' ? c.tax_arrears.value : undefined,
        support_purpose: c.support_purpose?.value,
      }
      applyDraft(draft)
    } catch {
      // ignore parse error
    }
  }, [region, city, industry, businessAgeYears, employeeCount, taxArrears, supportPurpose])

  if (!programId) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="mb-4 text-red-600">공고 정보가 없습니다. 공고 상세에서 다시 시도해주세요.</p>
        <Link href="/search" className="rounded-lg bg-black px-4 py-2 text-sm text-white">
          실제 공고 검색으로 이동
        </Link>
      </div>
    )
  }

  async function handleCheckEligibility() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: programId,
          profile: {
            region: region || undefined,
            city: city || undefined,
            industry: industry || undefined,
            business_age_years: businessAgeYears ? Number(businessAgeYears) : undefined,
            employee_count: employeeCount ? Number(employeeCount) : undefined,
            tax_arrears: taxArrears === 'yes' ? true : taxArrears === 'no' ? false : undefined,
            support_purpose: supportPurpose || undefined,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(String(json.error ?? '자격판정에 실패했습니다.'))
      setResult(json as EligibilityResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : '자격판정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">공고별 자격판정</h1>
        <p className="mb-6 text-sm text-gray-500">
          기업 정보를 입력하면 선택한 공고에 대한 신청 가능성을 분석합니다.
        </p>

        <div className="rounded-xl border bg-white p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="지역">
              <input value={region} onChange={(e) => setRegion(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="예: 경기" />
            </Field>
            <Field label="시군구">
              <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="예: 양주시" />
            </Field>
            <Field label="업종">
              <input value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="예: 제조업" />
            </Field>
            <Field label="업력 (년)">
              <input type="number" min="0" value={businessAgeYears} onChange={(e) => setBusinessAgeYears(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="예: 1" />
            </Field>
            <Field label="직원 수">
              <input type="number" min="0" value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="예: 5" />
            </Field>
            <Field label="세금 체납 여부">
              <select value={taxArrears} onChange={(e) => setTaxArrears(e.target.value as 'yes' | 'no' | '')} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="">선택 안함</option>
                <option value="no">없음</option>
                <option value="yes">있음</option>
              </select>
            </Field>
          </div>
          <Field label="지원 목적">
            <input value={supportPurpose} onChange={(e) => setSupportPurpose(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="예: 운전자금" />
          </Field>

          <button
            onClick={handleCheckEligibility}
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            자격판정 실행
          </button>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {result && (
          <div className="mt-6 space-y-4 rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">판정 결과</p>
                <p className="text-lg font-semibold text-gray-900">{result.label}</p>
              </div>
              <p className={`text-2xl font-black ${scoreColor}`}>{result.score}점</p>
            </div>

            {result.explanation && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{result.explanation}</p>
            )}

            <ResultList title="충족 조건" items={result.passed} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} emptyText="없음" />
            <ResultList title="미충족/검토 필요" items={result.failed} icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />} emptyText="없음" />
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="mb-1 text-xs font-medium text-gray-600">{label}</p>
      {children}
    </div>
  )
}

function ResultList({
  title,
  items,
  icon,
  emptyText,
}: {
  title: string
  items: string[]
  icon: React.ReactNode
  emptyText: string
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-gray-900">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
              {icon}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function EligibilityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <EligibilityContent />
    </Suspense>
  )
}
