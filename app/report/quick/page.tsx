'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatKRW } from '@/types'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import { TrendingUp, AlertTriangle, CheckCircle2, Search, ArrowLeft, Printer } from 'lucide-react'
import { SITE_NAME, getSiteUrl } from '@/lib/site-config'

function canonicalHostname(): string {
  try {
    return new URL(getSiteUrl()).hostname
  } catch {
    return ''
  }
}

// ─── 빠른 진단 채점 로직 ──────────────────────────────────────────
function computeQuickScore(parsed: ParseNLResult): {
  score: number
  grade: string
  gradeColor: string
  selfPct: number
  expertPct: number
  factors: { label: string; positive: boolean; desc: string }[]
} {
  const c = parsed.conditions
  let score = 50 // 기본 점수

  const factors: { label: string; positive: boolean; desc: string }[] = []

  // 지역 확인
  if (c.region) {
    score += 10
    factors.push({ label: '지역 확인됨', positive: true, desc: `${c.region.value} 지역 지원사업 대상 범위 내` })
  } else {
    factors.push({ label: '지역 미입력', positive: false, desc: '지역 정보 입력 시 매칭 정확도 향상' })
  }

  // 업력 분석
  if (c.business_age_years) {
    const age = c.business_age_years.value
    if (age <= 7) {
      score += 15
      factors.push({ label: '업력 적합', positive: true, desc: `${age}년 — 창업지원 사업 다수 지원 가능` })
    } else if (age <= 15) {
      score += 8
      factors.push({ label: '업력 보통', positive: true, desc: `${age}년 — 중소기업 일반지원 대상` })
    } else {
      factors.push({ label: '업력 긴 편', positive: false, desc: `${age}년 — 창업지원 제외, 중진공 사업 검토 권장` })
    }
  }

  // 직원 수
  if (c.employee_count) {
    const emp = c.employee_count.value
    if (emp <= 50) {
      score += 8
      factors.push({ label: '소기업 해당', positive: true, desc: `${emp}명 — 소기업·소상공인 지원사업 적용 가능` })
    } else if (emp <= 300) {
      score += 5
      factors.push({ label: '중기업 해당', positive: true, desc: `${emp}명 — 중소기업 일반지원 대상` })
    } else {
      factors.push({ label: '중기업 상한 초과', positive: false, desc: `${emp}명 — 일부 지원사업 직원 수 제한 초과 가능` })
    }
  }

  // 희망 금액
  if (c.desired_amount_krw) {
    const amt = c.desired_amount_krw.value
    score += 5
    factors.push({
      label: '희망 금액 확인',
      positive: true,
      desc: `${formatKRW(amt)} 규모 지원사업 필터링 가능`,
    })
  }

  // 세금 체납
  if (c.tax_arrears?.value) {
    score -= 15
    factors.push({ label: '세금 체납 있음', positive: false, desc: '대부분 지원사업에서 결격 사유 — 납부 후 신청 권장' })
  }

  // 점수 범위 클램핑
  score = Math.min(Math.max(score, 0), 100)

  let grade = 'D'
  let gradeColor = 'bg-gray-100 text-gray-700'
  if (score >= 85) { grade = 'A'; gradeColor = 'bg-green-100 text-green-700' }
  else if (score >= 70) { grade = 'B'; gradeColor = 'bg-blue-100 text-blue-700' }
  else if (score >= 55) { grade = 'C'; gradeColor = 'bg-yellow-100 text-yellow-700' }

  const selfPct = Math.round(score * 0.6 + Math.random() * 10)
  const expertPct = Math.round(score * 0.8 + Math.random() * 8)

  return {
    score,
    grade,
    gradeColor,
    selfPct: Math.min(selfPct, 95),
    expertPct: Math.min(expertPct, 98),
    factors,
  }
}

// ─── 메인 컨텐츠 ──────────────────────────────────────────────────
function QuickReportContent() {
  const searchParams = useSearchParams()
  const [parsed, setParsed] = useState<ParseNLResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dataParam = searchParams.get('data')
    if (!dataParam) {
      setError('진단 데이터가 없습니다.')
      return
    }
    try {
      setParsed(JSON.parse(decodeURIComponent(dataParam)) as ParseNLResult)
    } catch {
      setError('데이터를 불러올 수 없습니다.')
    }
  }, [searchParams])

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="mb-4 text-destructive">{error}</p>
        <Link href="/" className={buttonVariants()}>홈으로</Link>
      </div>
    )
  }

  if (!parsed) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const { score, grade, gradeColor, selfPct, expertPct, factors } = computeQuickScore(parsed)

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      {/* 상단 액션 바 */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <a
          href={`/diagnosis?q=${encodeURIComponent(parsed.raw_query)}&data=${searchParams.get('data') ?? ''}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-2')}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          조건 확인으로 돌아가기
        </a>
        <button
          onClick={() => window.print()}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <Printer className="h-4 w-4" />
          PDF로 저장
        </button>
      </div>

      {/* 참고용 배너 */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
        <p className="text-xs text-yellow-700">
          <strong>참고용 사전 진단</strong> — 이 결과는 입력 조건을 기반으로 한 AI 추정치이며,
          실제 공고 조건 및 주관기관 심사 결과와 다를 수 있습니다. 정확한 신청 가능 여부는
          실제 공고 검색을 통해 확인하세요.
        </p>
      </div>

      {/* 점수 카드 */}
      <Card className="mb-6 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 pb-6 pt-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-100">빠른 AI 진단 결과</p>
              <CardTitle className="mt-1 text-2xl">정책자금 신청 가능성 진단</CardTitle>
            </div>
            <div className={cn('flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold', gradeColor)}>
              {grade}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* 점수 바 */}
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">종합 적합도 점수</span>
              <span className="font-bold text-blue-600">{score}점 / 100점</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* Self / Expert 예측 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-xs text-muted-foreground">자가 신청 예상 성공률</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{selfPct}%</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-xs text-muted-foreground">전문가 지원 시 예상 성공률</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{expertPct}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 분석 요인 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            진단 분석 요인
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {factors.map((f, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border px-4 py-2.5">
                {f.positive ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 법적 고지 */}
      <p className="mb-8 rounded-lg bg-gray-50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        본 서비스의 자격판정 및 추천 결과는 공고 원문과 사용자 입력 정보를 바탕으로 한 참고용 분석입니다.
        실제 신청 가능 여부와 선정 여부는 각 주관기관의 최종 심사 기준에 따라 달라질 수 있습니다.
        본 서비스는 정책자금 선정 또는 지원금 수령을 보장하지 않습니다.
      </p>

      {/* 실제 공고 검색 CTA (인쇄 시 숨김) */}
      <div className="rounded-xl border-2 border-blue-100 bg-blue-50 p-6 text-center print:hidden">
        <p className="mb-2 font-semibold text-foreground">더 정확한 결과를 원하시나요?</p>
        <p className="mb-4 text-sm text-muted-foreground">
          실제 공공 데이터 기반 공고를 검색하고 공고별 자격판정 결과를 확인하세요.
        </p>
        <Link
          href="/search"
          className={cn(buttonVariants(), 'gap-2')}
        >
          <Search className="h-4 w-4" />
          실제 공고 맞춤 검색 →
        </Link>
      </div>

      {/* 인쇄 전용 푸터 */}
      <div className="mt-8 hidden border-t pt-4 text-center text-xs text-gray-400 print:block">
        <p>본 진단 결과는 {SITE_NAME}에서 제공하는 참고용 분석이며 법적 효력이 없습니다.</p>
        <p className="mt-1">
          출력일: {new Date().toLocaleDateString('ko-KR')}
          {canonicalHostname() ? ` · ${canonicalHostname()}` : ''}
        </p>
      </div>
    </div>
  )
}

export default function QuickReportPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto max-w-2xl px-4 py-16 space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    }>
      <QuickReportContent />
    </Suspense>
  )
}
