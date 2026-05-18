'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, Suspense, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatKRW } from '@/types'
import type { ParseNLResult, ParsedConditions } from '@/lib/query/parseNaturalLanguage'
import { AlertCircle, CheckCircle2, HelpCircle, Pencil, Zap, Search } from 'lucide-react'
import ConditionEditInput from '@/components/diagnosis/ConditionEditInput'
import ConditionNumericStepper from '@/components/diagnosis/ConditionNumericStepper'
import DiagnosisConfirmChips from '@/components/diagnosis/DiagnosisConfirmChips'
import { mergeSavedProfileIntoParsed } from '@/lib/profile/business-profile-defaults'
import { fetchMyBusinessProfileDefaults } from '@/lib/profile/fetch-my-business-profile'
import { coerceValueByKey } from '@/lib/diagnosis/coerce'
import { applyDiagnosisSearchNavigation, buildDiagnosisQuickReportHref } from '@/lib/diagnosis/navigate'

// ─── 조건 표시 라벨 매핑 ───────────────────────────────────
const CONDITION_LABELS: Record<string, string> = {
  region: '📍 지역',
  city: '🏙️ 시군구',
  industry: '🏭 업종',
  business_age_years: '📅 업력',
  employee_count: '👥 직원 수',
  annual_revenue_krw: '💰 연 매출',
  desired_amount_krw: '🎯 희망 지원금',
  support_purpose: '📋 지원 목적',
  business_type: '🏢 사업자 유형',
  startup_stage: '🚀 창업 단계',
  credit_score: '📊 신용점수',
  tax_arrears: '📂 세금 체납',
}

const MISSING_LABELS: Record<string, string> = {
  region: '지역',
  city: '시군구',
  industry: '업종',
  business_age_years: '업력',
  employee_count: '직원 수',
  annual_revenue_krw: '연 매출',
  desired_amount_krw: '희망 지원금',
  support_purpose: '지원 목적',
  business_type: '사업자 유형',
  startup_stage: '창업 단계',
  credit_score: '신용점수',
  tax_arrears: '세금 체납',
}

function formatConditionValue(key: string, value: unknown, sourceText?: string): string {
  if (key === 'annual_revenue_krw' || key === 'desired_amount_krw') {
    return formatKRW(Number(value))
  }
  if (key === 'business_age_years') {
    if (sourceText?.includes('미만')) return sourceText.trim()
    return `${value}년`
  }
  if (key === 'employee_count') return `${value}명`
  if (key === 'credit_score') return `${value}점`
  if (key === 'tax_arrears') return value ? '있음' : '없음'
  return String(value)
}

function getConditionEntries(conditions: ParsedConditions) {
  return Object.entries(conditions).filter(([, v]) => v != null) as [
    string,
    { value: unknown; confidence: number; source_text?: string },
  ][]
}

function conditionHasDisplayValue(
  parsed: ParseNLResult,
  editValues: Record<string, string>,
  key: string
): boolean {
  const rawEdit = editValues[key]
  if (rawEdit !== undefined && rawEdit.trim() !== '') return true
  const cond = parsed.conditions[key as keyof ParsedConditions]
  if (cond == null) return false
  const v = cond.value
  if (v === undefined || v === null) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (typeof v === 'number' || typeof v === 'boolean') return true
  return true
}

function buildEffectiveEntries(
  parsed: ParseNLResult,
  editValues: Record<string, string>
): [string, { value: unknown; confidence: number; source_text?: string }][] {
  const base = getConditionEntries(parsed.conditions)
  const keysInBase = new Set(base.map(([k]) => k))

  const extra: [string, { value: unknown; confidence: number; source_text?: string }][] = []
  for (const k of parsed.missing_important) {
    if (keysInBase.has(k)) continue
    const raw = (editValues[k] ?? '').trim()
    if (!raw) continue
    const coerced = coerceValueByKey(k, raw)
    extra.push([k, { value: coerced !== undefined ? coerced : raw, confidence: 0.35 }])
  }
  return [...base, ...extra]
}

function missingNeedsYellowAddRow(parsed: ParseNLResult, key: string): boolean {
  const inExtracted = getConditionEntries(parsed.conditions).some(([k]) => k === key)
  return !inExtracted
}

const NUMERIC_STEPPER_KEYS = new Set(['business_age_years', 'employee_count'])

// ─── 메인 컨텐츠 ───────────────────────────────────────────
function DiagnosisContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [parsed, setParsed] = useState<ParseNLResult | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  /** 저장 전 임시 입력값 (한글 조합 중 UI가 바뀌지 않도록 editValues 와 분리) */
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const [editMode, setEditMode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sid = searchParams.get('sid')
    const dataParam = searchParams.get('data')
    if (!sid && !dataParam) {
      const programId = searchParams.get('program_id')
      if (programId) {
        router.replace(`/eligibility?program_id=${encodeURIComponent(programId)}`)
        return
      }
      setError('검색 조건이 없습니다. 홈으로 돌아가 검색해주세요.')
      return
    }

    let cancelled = false
    setError(null)

    async function applyParsed(data: ParseNLResult) {
      let merged = data
      try {
        const prof = await fetchMyBusinessProfileDefaults()
        if (!cancelled && prof) merged = mergeSavedProfileIntoParsed(data, prof)
      } catch {
        /* 프로필 없음·오류 시 원본만 사용 */
      }
      if (cancelled) return
      setParsed(merged)
      const initValues: Record<string, string> = {}
      Object.entries(merged.conditions).forEach(([key, cond]) => {
        if (cond) initValues[key] = String((cond as { value: unknown }).value)
      })
      setEditValues(initValues)
    }

    ;(async () => {
      try {
        if (sid) {
          const token = searchParams.get('token')?.trim()
          if (!token) {
            if (!cancelled) {
              setError('진단 링크가 만료되었거나 올바르지 않습니다. 홈에서 다시 검색해주세요.')
            }
            return
          }
          const res = await fetch(
            `/api/diagnosis/session?id=${encodeURIComponent(sid)}&token=${encodeURIComponent(token)}`
          )
          const json = (await res.json()) as { ok?: boolean; parsed?: ParseNLResult; message?: string }
          if (!res.ok || !json.parsed) {
            if (!cancelled) {
              setError(String(json.message ?? '진단 세션을 불러올 수 없습니다. 홈에서 다시 검색해주세요.'))
            }
            return
          }
          await applyParsed(json.parsed)
          return
        }

        const data = JSON.parse(decodeURIComponent(dataParam!)) as ParseNLResult
        await applyParsed(data)
        try {
          const saveRes = await fetch('/api/diagnosis/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw_query: data.raw_query, parsed: data }),
          })
          const saveJson = (await saveRes.json()) as { sid?: string; token?: string }
          if (saveRes.ok && saveJson.sid && saveJson.token) {
            const params = new URLSearchParams({ sid: saveJson.sid, token: saveJson.token })
            router.replace(`/diagnosis?${params.toString()}`)
          }
        } catch {
          /* 레거시 ?data= URL 유지 */
        }
      } catch {
        if (!cancelled) setError('조건 데이터가 유효하지 않습니다.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, router])

  function navigateToSearch() {
    if (!parsed) {
      router.push('/search')
      return
    }
    applyDiagnosisSearchNavigation(router, parsed, editValues)
  }

  function beginEdit(key: string, initial = '') {
    setEditMode(key)
    setDraftValues((prev) => ({
      ...prev,
      [key]: prev[key] ?? editValues[key] ?? initial,
    }))
  }

  function handleEditSave(key: string) {
    const next = (draftValues[key] ?? editValues[key] ?? '').trim()
    if (next) {
      setEditValues((prev) => ({ ...prev, [key]: next }))
    }
    setEditMode(null)
  }

  function handleEditCancel() {
    setEditMode(null)
  }

  function getConfidenceBadge(confidence: number) {
    if (confidence >= 0.8) {
      return <span className="ml-1.5 flex items-center gap-0.5 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" /> 확인</span>
    }
    if (confidence >= 0.4) {
      return <span className="ml-1.5 flex items-center gap-0.5 text-xs text-yellow-600"><HelpCircle className="h-3 w-3" /> 추정</span>
    }
    return <span className="ml-1.5 flex items-center gap-0.5 text-xs text-red-500"><AlertCircle className="h-3 w-3" /> 불확실</span>
  }

  const effectiveEntries = useMemo(
    () => parsed ? buildEffectiveEntries(parsed, editValues) : [],
    [parsed, editValues]
  )

  /** API/캐시 불일치 시에도 이미 추출·편집된 항목은 "추가 입력" 배지에서 제외 */
  const stillMissingImportant = useMemo(() => {
    if (!parsed) return []
    return parsed.missing_important.filter(
      (k) => !conditionHasDisplayValue(parsed, editValues, k)
    )
  }, [parsed, editValues])

  const uncertainExtractedKeys = useMemo(() => {
    return effectiveEntries
      .filter(([, c]) => c.confidence < 0.4)
      .map(([k]) => MISSING_LABELS[k] ?? k)
  }, [effectiveEntries])

  if (error) {
    const q = searchParams.get('q') ?? ''
    const searchHref = q ? `/search?keyword=${encodeURIComponent(q)}` : '/search'
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="mb-4 text-destructive">{error}</p>
        <div className="flex items-center justify-center gap-2">
          <Link href={searchHref} className={buttonVariants()}>
            실제 공고 검색으로 이동
          </Link>
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>홈으로 돌아가기</Link>
        </div>
      </div>
    )
  }

  if (!parsed) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Skeleton className="mb-4 h-8 w-64" />
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      {/* 원본 질문 */}
      <div className="mb-6 rounded-lg border bg-blue-50/50 p-4">
        <p className="text-xs font-medium text-muted-foreground">입력한 질문</p>
        <p className="mt-1 text-sm font-medium text-foreground">&ldquo;{parsed.raw_query}&rdquo;</p>
      </div>

      {/* AI 요약 */}
      {parsed.summary && (
        <div className="mb-6 rounded-lg border-l-4 border-l-blue-500 bg-white p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">AI 분석 요약: </span>
            {parsed.summary}
          </p>
        </div>
      )}

      {/* 추출된 조건 카드 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">추출된 조건 확인</CardTitle>
          <p className="text-xs text-muted-foreground">
            AI가 추출한 조건을 확인하고 수정해주세요. 정확할수록 검색 결과가 향상됩니다.
          </p>
        </CardHeader>
        <CardContent>
          {effectiveEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              추출된 조건이 없습니다. 질문을 더 구체적으로 입력해주세요.
            </p>
          ) : (
            <div className="space-y-2">
              {effectiveEntries.map(([key, cond]) => {
                const c = cond as { value: unknown; confidence: number; source_text?: string }
                const label = CONDITION_LABELS[key] ?? key
                const displayValue = formatConditionValue(
                  key,
                  editValues[key] ?? c.value,
                  c.source_text
                )
                const useStepper =
                  NUMERIC_STEPPER_KEYS.has(key) && c.confidence < 0.4 && editMode !== key
                const numericRaw = editValues[key] ?? String(c.value ?? '0')
                const numericVal = Number(String(numericRaw).replace(/,/g, ''))

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border px-4 py-2.5 hover:bg-muted/30"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        {getConfidenceBadge(c.confidence)}
                      </div>
                      {useStepper && Number.isFinite(numericVal) ? (
                        <div className="mt-1">
                          <ConditionNumericStepper
                            value={numericVal}
                            min={0}
                            max={key === 'employee_count' ? 50000 : 100}
                            unit={key === 'business_age_years' ? '년' : '명'}
                            onChange={(n) =>
                              setEditValues((prev) => ({ ...prev, [key]: String(n) }))
                            }
                          />
                        </div>
                      ) : editMode === key ? (
                        <div className="mt-1 flex items-center gap-2">
                          <ConditionEditInput
                            value={draftValues[key] ?? ''}
                            onChange={(v) => setDraftValues((prev) => ({ ...prev, [key]: v }))}
                            onSave={() => handleEditSave(key)}
                            onCancel={handleEditCancel}
                            placeholder={
                              key === 'industry' ? '예: 응용소프트웨어업, 제조업, IT' : undefined
                            }
                            className="h-7 min-w-[10rem] rounded border px-2 text-sm outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => handleEditSave(key)}
                            className={cn(buttonVariants({ size: 'sm' }), 'h-7 px-2 text-xs')}
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={handleEditCancel}
                            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 px-2 text-xs')}
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{displayValue}</span>
                      )}
                    </div>
                    {editMode !== key && !useStepper && (
                      <button
                        type="button"
                        onClick={() => beginEdit(key, String(c.value ?? ''))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 누락 조건 알림 */}
      {stillMissingImportant.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-yellow-700">
            <HelpCircle className="h-4 w-4" /> 추가 입력 시 더 정확한 결과
          </p>
          <div className="flex flex-wrap gap-1.5">
            {stillMissingImportant.map((item) => (
              <Badge key={item} variant="outline" className="border-yellow-300 bg-white text-xs text-yellow-700">
                {MISSING_LABELS[item] ?? item}
              </Badge>
            ))}
          </div>
          {stillMissingImportant.some(
            (k) => !conditionHasDisplayValue(parsed, editValues, k) && missingNeedsYellowAddRow(parsed, k)
          ) && (
            <div className="mt-3 space-y-2 border-t border-yellow-200/80 pt-3">
              <p className="text-xs text-yellow-800">아래에서 직접 입력할 수 있습니다.</p>
              {stillMissingImportant
                .filter(
                  (k) => !conditionHasDisplayValue(parsed, editValues, k) && missingNeedsYellowAddRow(parsed, k)
                )
                .map((key) => (
                  <div
                    key={key}
                    className="flex flex-col gap-2 rounded-md border border-yellow-200/80 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm font-medium text-yellow-900">{MISSING_LABELS[key] ?? key}</span>
                    {NUMERIC_STEPPER_KEYS.has(key) ? (
                      <ConditionNumericStepper
                        value={Number(editValues[key] ?? '0') || 0}
                        min={0}
                        max={key === 'employee_count' ? 50000 : 100}
                        unit={key === 'business_age_years' ? '년' : '명'}
                        onChange={(n) => setEditValues((prev) => ({ ...prev, [key]: String(n) }))}
                      />
                    ) : editMode === key ? (
                      <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                        <ConditionEditInput
                          value={draftValues[key] ?? ''}
                          onChange={(v) => setDraftValues((prev) => ({ ...prev, [key]: v }))}
                          onSave={() => handleEditSave(key)}
                          onCancel={handleEditCancel}
                          placeholder={
                            key === 'industry'
                              ? '예: 응용소프트웨어업, 제조업, IT'
                              : '값을 입력하세요'
                          }
                          className="h-8 min-w-[12rem] flex-1 rounded border px-2 text-sm outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => handleEditSave(key)}
                          className={cn(buttonVariants({ size: 'sm' }), 'h-8 shrink-0 text-xs')}
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={handleEditCancel}
                          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 shrink-0 text-xs')}
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => beginEdit(key, '')}
                        className={cn(
                          buttonVariants({ variant: 'secondary', size: 'sm' }),
                          'h-8 w-full shrink-0 text-xs sm:w-auto'
                        )}
                      >
                        입력하기
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <DiagnosisConfirmChips parsed={parsed} editValues={editValues} onSearch={navigateToSearch} />

      {(stillMissingImportant.length > 0 || uncertainExtractedKeys.length > 0) && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">검색 전에 확인해 주세요</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
            {stillMissingImportant.length > 0 &&
              '중요 조건이 비어 있으면 검색 결과가 없거나 엉뚱할 수 있습니다. '}
            {uncertainExtractedKeys.length > 0 &&
              `AI가 확신하지 못한 항목: ${uncertainExtractedKeys.join(', ')}. `}
            결과가 없으면 조건 해석 문제인지, 해당 공고가 없는 것인지 구분하기 어렵습니다.
          </p>
        </div>
      )}

      {/* 법적 고지 */}
      <p className="mb-8 rounded-lg bg-gray-50 px-4 py-3 text-xs text-muted-foreground">
        이 결과는 입력 조건을 기반으로 한 참고용 사전 분석입니다. 정확한 신청 가능 여부는
        실제 공고 조건과 주관기관 기준에 따라 달라질 수 있습니다.
      </p>

      {/* 방식 선택 버튼 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={buildDiagnosisQuickReportHref(parsed, {
            sid: searchParams.get('sid'),
            encodedData: searchParams.get('data'),
          })}
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'flex h-auto flex-col items-start gap-1 px-5 py-4 text-left'
          )}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-yellow-500" />
            빠른 AI 진단
          </div>
          <span className="text-xs font-normal text-muted-foreground">
            약 3~5초 · AI 참고용 사전 진단 결과
          </span>
        </a>
        <button
          type="button"
          onClick={navigateToSearch}
          className={cn(
            buttonVariants(),
            'flex h-auto flex-col items-start gap-1 px-5 py-4 text-left'
          )}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Search className="h-4 w-4" />
            실제 공고 맞춤 검색
          </div>
          <span className="text-xs font-normal text-primary-foreground/80">
            약 10~20초 · 실제 공공 데이터 기반 공고 목록
          </span>
        </button>
      </div>
    </div>
  )
}

// Suspense 래핑 (useSearchParams 요구사항)
export default function DiagnosisPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Skeleton className="mb-4 h-8 w-64" />
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    }>
      <DiagnosisContent />
    </Suspense>
  )
}
