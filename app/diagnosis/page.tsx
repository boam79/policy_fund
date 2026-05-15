'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatKRW } from '@/types'
import type { ParseNLResult, ParsedConditions } from '@/lib/query/parseNaturalLanguage'
import { AlertCircle, CheckCircle2, HelpCircle, Pencil, Zap, Search } from 'lucide-react'

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

function normalizeRegionForFilter(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw) return null
  return REGION_NORMALIZE_MAP[raw] ?? raw
}

function formatConditionValue(key: string, value: unknown): string {
  if (key === 'annual_revenue_krw' || key === 'desired_amount_krw') {
    return formatKRW(Number(value))
  }
  if (key === 'business_age_years') return `${value}년`
  if (key === 'employee_count') return `${value}명`
  if (key === 'credit_score') return `${value}점`
  if (key === 'tax_arrears') return value ? '있음' : '없음'
  return String(value)
}

function coerceValueByKey(key: string, raw: string): unknown {
  const value = raw.trim()
  if (value.length === 0) return undefined

  if (['business_age_years', 'employee_count', 'annual_revenue_krw', 'desired_amount_krw', 'credit_score'].includes(key)) {
    const n = Number(value.replace(/,/g, ''))
    return Number.isFinite(n) ? n : undefined
  }
  if (key === 'tax_arrears') {
    if (['있음', 'yes', 'true', '1'].includes(value.toLowerCase())) return true
    if (['없음', 'no', 'false', '0'].includes(value.toLowerCase())) return false
    return undefined
  }
  return value
}

// ─── 메인 컨텐츠 ───────────────────────────────────────────
function DiagnosisContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [parsed, setParsed] = useState<ParseNLResult | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [editMode, setEditMode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dataParam = searchParams.get('data')
    if (!dataParam) {
      const programId = searchParams.get('program_id')
      if (programId) {
        router.replace(`/eligibility?program_id=${encodeURIComponent(programId)}`)
        return
      }
      setError('검색 조건이 없습니다. 홈으로 돌아가 검색해주세요.')
      return
    }
    try {
      const data = JSON.parse(decodeURIComponent(dataParam)) as ParseNLResult
      setParsed(data)
      // 편집용 초기값 설정
      const initValues: Record<string, string> = {}
      Object.entries(data.conditions).forEach(([key, cond]) => {
        if (cond) initValues[key] = String((cond as { value: unknown }).value)
      })
      setEditValues(initValues)
    } catch {
      setError('조건 데이터가 유효하지 않습니다.')
    }
  }, [searchParams, router])

  function handleEditSave(key: string) {
    setEditMode(null)
  }

  function getConditionEntries(conditions: ParsedConditions) {
    return Object.entries(conditions).filter(([, v]) => v != null)
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

  if (error) {
    const q = searchParams.get('q') ?? ''
    const searchHref = q ? `/search?keyword=${encodeURIComponent(q)}` : '/search'
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="mb-4 text-destructive">{error}</p>
        <div className="flex items-center justify-center gap-2">
          <a href={searchHref} className={buttonVariants()}>
            실제 공고 검색으로 이동
          </a>
          <a href="/" className={buttonVariants({ variant: 'outline' })}>홈으로 돌아가기</a>
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

  const entries = getConditionEntries(parsed.conditions)

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      {/* 원본 질문 */}
      <div className="mb-6 rounded-lg border bg-blue-50/50 p-4">
        <p className="text-xs font-medium text-muted-foreground">입력한 질문</p>
        <p className="mt-1 text-sm font-medium text-foreground">"{parsed.raw_query}"</p>
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
          {entries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              추출된 조건이 없습니다. 질문을 더 구체적으로 입력해주세요.
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map(([key, cond]) => {
                const c = cond as { value: unknown; confidence: number; source_text?: string }
                const label = CONDITION_LABELS[key] ?? key
                const displayValue = formatConditionValue(key, editValues[key] ?? c.value)

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
                      {editMode === key ? (
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            autoFocus
                            type="text"
                            value={editValues[key] ?? ''}
                            onChange={(e) =>
                              setEditValues((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            onKeyDown={(e) => e.key === 'Enter' && handleEditSave(key)}
                            className="h-7 rounded border px-2 text-sm outline-none focus:border-primary"
                          />
                          <button
                            onClick={() => handleEditSave(key)}
                            className={cn(buttonVariants({ size: 'sm' }), 'h-7 px-2 text-xs')}
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditMode(null)}
                            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 px-2 text-xs')}
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{displayValue}</span>
                      )}
                    </div>
                    {editMode !== key && (
                      <button
                        onClick={() => setEditMode(key)}
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
      {parsed.missing_important.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-yellow-700">
            <HelpCircle className="h-4 w-4" /> 추가 입력 시 더 정확한 결과
          </p>
          <div className="flex flex-wrap gap-1.5">
            {parsed.missing_important.map((item) => (
              <Badge key={item} variant="outline" className="border-yellow-300 bg-white text-xs text-yellow-700">
                {MISSING_LABELS[item] ?? item}
              </Badge>
            ))}
          </div>
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
          href={`/report/quick?data=${searchParams.get('data') ?? ''}`}
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
          onClick={() => {
            if (!parsed) { router.push('/search'); return }
            const c = parsed.conditions
            const params = new URLSearchParams()

            const getValue = (key: keyof ParsedConditions) => {
              const edited = editValues[key]
              if (typeof edited === 'string') {
                return coerceValueByKey(String(key), edited)
              }
              return c[key]?.value
            }

            const region = getValue('region')
            const city = getValue('city')
            const industry = getValue('industry')
            const businessAge = getValue('business_age_years')
            const employeeCount = getValue('employee_count')
            const annualRevenue = getValue('annual_revenue_krw')
            const creditScore = getValue('credit_score')
            const taxArrears = getValue('tax_arrears')
            const supportPurpose = getValue('support_purpose')

            const normalizedRegion = normalizeRegionForFilter(region)
            if (normalizedRegion) params.set('region', normalizedRegion)
            if (city) params.set('city', String(city))
            if (industry) params.set('industry', String(industry))
            if (businessAge != null) params.set('business_age_years', String(businessAge))
            if (employeeCount != null) params.set('employee_count', String(employeeCount))
            if (annualRevenue != null) params.set('annual_revenue_krw', String(annualRevenue))
            if (creditScore != null) params.set('credit_score', String(creditScore))
            if (typeof taxArrears === 'boolean') params.set('tax_arrears', taxArrears ? 'yes' : 'no')
            if (supportPurpose) params.set('support_purpose', String(supportPurpose))

            // keyword는 짧은 목적/업종 중심으로만 전달 (긴 자연어 문장 직접 전달 금지)
            if (supportPurpose) {
              params.set('keyword', String(supportPurpose))
            } else if (industry) {
              params.set('keyword', String(industry))
            }
            router.push(`/search?${params.toString()}`)
          }}
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
