'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, Calendar, CheckSquare, ChevronDown, ChevronUp, Download, Loader2, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import { readApiError } from '@/lib/api/readApiError'

type Tab = 'plan' | 'checklist' | 'timeline'

interface Section { order?: number; title: string; draft?: string; guideline?: string; fillInRequired?: string[]; subsections?: { title: string; draft: string; fillInRequired?: string[] }[] }
interface ChecklistItem { name: string; issuer: string; issuanceDays: number; collectBy?: string; url?: string; note?: string; requirementType: string; isStandardDocument: boolean }
interface Milestone { stage: string; date: string; dow: string; isWeekend: boolean; description: string; actionItems: string[]; urgency: string }
interface JourneyProfileSeed {
  company_name?: string | null
  industry?: string | null
  employee_count?: number | null
  business_type?: string | null
  desired_amount_krw?: number | null
  support_purpose?: string | null
  region?: string | null
  city?: string | null
  business_age_years?: number | null
  startup_stage?: string | null
  annual_revenue_krw?: number | null
  tax_arrears?: boolean | null
}
interface JourneySearchSeed {
  natural_language_query?: string | null
  extracted_conditions?: Record<string, unknown> | null
}
interface ProgramSeed {
  title?: string | null
  organization?: string | null
  region?: string | null
  industry?: string | null
  support_type?: string | null
  eligibility_text?: string | null
  summary_text?: string | null
  raw_content?: string | null
  application_end_date?: string | null
  application_start_date?: string | null
}

function buildAnnouncementFromProgram(p: ProgramSeed | null): string {
  if (!p) return ''
  const parts: string[] = []
  if (p.organization?.trim()) parts.push(`주관기관: ${stripHtmlToText(p.organization)}`)
  if (p.region?.trim()) parts.push(`지원지역: ${stripHtmlToText(p.region)}`)
  if (p.support_type?.trim()) parts.push(`지원 내용: ${stripHtmlToText(p.support_type)}`)
  if (p.eligibility_text?.trim()) parts.push(`신청 자격:\n${stripHtmlToText(p.eligibility_text)}`)
  if (p.summary_text?.trim()) parts.push(`요약:\n${stripHtmlToText(p.summary_text)}`)
  if (parts.length === 0 && p.raw_content?.trim()) {
    parts.push(stripHtmlToText(p.raw_content, { maxLength: 12000 }))
  }
  return parts.join('\n\n')
}

const LEGAL_DISCLAIMER = '본 문서 초안은 AI가 생성한 참고용 자료이며 법적 효력이 없습니다. 실제 제출 전 반드시 전문가 검토 및 공고문 기준에 맞게 수정하세요.'

function DocumentPlanContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const loginNext = useMemo(() => {
    const q = searchParams.toString()
    return q ? `/documents/plan?${q}` : '/documents/plan'
  }, [searchParams])
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [tab, setTab] = useState<Tab>('plan')
  const [template, setTemplate] = useState<'gov' | 'psst'>('gov')
  const [loading, setLoading] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [journeyHint, setJourneyHint] = useState('')
  const [programId, setProgramId] = useState('')

  // 공통 입력
  const [title, setTitle] = useState('')
  const [announcementText, setAnnouncementText] = useState('')
  const [deadline, setDeadline] = useState('')
  const [businessType, setBusinessType] = useState<'법인' | '개인'>('법인')

  // 회사 프로필
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [employeeCount, setEmployeeCount] = useState('')
  const [problemStatement, setProblemStatement] = useState('')
  const [solution, setSolution] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')

  // 결과
  const [planResult, setPlanResult] = useState<{ sections: Section[]; draftMeta: { missingData: string[]; confidence: number } } | null>(null)
  const [checklistResult, setChecklistResult] = useState<{ checklist: ChecklistItem[]; totalDocuments: number; preparationLeadDays: number; tips: string[] } | null>(null)
  const [timelineResult, setTimelineResult] = useState<{ milestones: Milestone[]; totalDaysLeft: number; warnings: string[]; tips: string[] } | null>(null)
  /** 공고에서 가져온 접수 시작일 — 타임라인 API startDate 전달용 */
  const [applicationStartDate, setApplicationStartDate] = useState('')

  const searchKey = searchParams.toString()

  useEffect(() => {
    let cancelled = false

    const tabParam = searchParams.get('tab')
    if (tabParam === 'plan' || tabParam === 'checklist' || tabParam === 'timeline') {
      setTab(tabParam)
    }

    const pid = searchParams.get('program_id') ?? ''
    setProgramId(pid)

    const urlTitle = searchParams.get('title')?.trim() ?? ''
    const urlDeadlineRaw = searchParams.get('deadline')?.trim() ?? ''
    const urlAnnouncement = searchParams.get('announcement')?.trim() ?? ''
    const urlDeadline = urlDeadlineRaw ? urlDeadlineRaw.slice(0, 10) : ''

    const hydrateFromJourney = async () => {
      setJourneyHint('')
      let profileSeed: JourneyProfileSeed | null = null
      let searchSeed: JourneySearchSeed | null = null
      let programSeed: ProgramSeed | null = null

      try {
        if (pid) {
          const { data: programData } = await supabase
            .from('support_programs')
            .select(
              'title,organization,region,industry,support_type,eligibility_text,summary_text,raw_content,application_end_date,application_start_date'
            )
            .eq('id', pid)
            .maybeSingle()
          programSeed = (programData as ProgramSeed | null) ?? null
        }

        const { data: auth } = await supabase.auth.getUser()
        const user = auth.user
        if (!cancelled) {
          setIsLoggedIn(Boolean(user))
          setAuthChecked(true)
        }
        if (user) {
          const [profileRes, searchRes] = await Promise.all([
            supabase
              .from('business_profiles')
              .select(
                'company_name,industry,employee_count,business_type,desired_amount_krw,support_purpose,region,city,business_age_years,startup_stage,annual_revenue_krw,tax_arrears'
              )
              .eq('user_id', user.id)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('search_sessions')
              .select('natural_language_query,extracted_conditions')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ])

          profileSeed = (profileRes.data as JourneyProfileSeed | null) ?? null
          searchSeed = (searchRes.data as JourneySearchSeed | null) ?? null
        }
      } catch {
        // 클라이언트 초기화 실패는 무시하고 localStorage 폴백 사용
        if (!cancelled) {
          setIsLoggedIn(false)
          setAuthChecked(true)
        }
      }

      let localQuery = ''
      let localParsed: Record<string, unknown> | null = null
      if (typeof window !== 'undefined') {
        localQuery = localStorage.getItem('pf:last_query') ?? ''
        try {
          const raw = localStorage.getItem('pf:last_parsed')
          if (raw) {
            const parsed = JSON.parse(raw) as { conditions?: Record<string, { value?: unknown }> }
            localParsed = Object.fromEntries(
              Object.entries(parsed.conditions ?? {}).map(([k, v]) => [k, v?.value])
            )
          }
        } catch {
          localParsed = null
        }
      }

      if (cancelled) return

      const cond = (searchSeed?.extracted_conditions as Record<string, unknown> | null) ?? localParsed ?? {}
      const queryText = searchSeed?.natural_language_query ?? localQuery
      const programAnnouncement = buildAnnouncementFromProgram(programSeed)
      const programDeadline = programSeed?.application_end_date?.slice(0, 10) ?? ''
      const progStart = programSeed?.application_start_date?.slice(0, 10) ?? ''

      const amount =
        (profileSeed?.desired_amount_krw as number | null) ?? (cond.desired_amount_krw as number | undefined)
      const workers = (profileSeed?.employee_count as number | null) ?? (cond.employee_count as number | undefined)
      const company = profileSeed?.company_name ?? null
      const industrySeed =
        (profileSeed?.industry as string | null) ??
        programSeed?.industry ??
        (cond.industry as string | undefined) ??
        null
      const businessTypeSeed = profileSeed?.business_type === '개인사업자' ? '개인' : profileSeed?.business_type

      let seededCount = 0
      if (company || industrySeed || workers || amount || queryText) seededCount += 1
      if (programSeed?.title || programAnnouncement || programDeadline) seededCount += 1

      setTitle((prev) => {
        if (urlTitle) return urlTitle
        if (pid) return stripHtmlToText(programSeed?.title ?? '')
        if (prev) return prev
        if (queryText) return `맞춤 지원사업 신청 (${queryText.slice(0, 80)})`
        return ''
      })
      setAnnouncementText((prev) => {
        if (urlAnnouncement) return urlAnnouncement
        if (pid) return programAnnouncement || ''
        if (prev) return prev
        return queryText || ''
      })
      setDeadline((prev) => {
        if (urlDeadline) return urlDeadline
        if (pid) return programDeadline || ''
        return prev || programDeadline || ''
      })

      if (pid) {
        setApplicationStartDate(progStart || '')
      }

      setCompanyName((prev) => prev || company || '')
      setIndustry((prev) => prev || industrySeed || '')
      setEmployeeCount((prev) => prev || (workers != null ? String(workers) : ''))
      setRequestedAmount((prev) => prev || (amount != null ? String(amount) : ''))
      setBusinessType((prev) => {
        if (prev === '개인') return prev
        return businessTypeSeed === '개인' ? '개인' : '법인'
      })
      setProblemStatement((prev) => {
        if (prev) return prev
        const purpose = (profileSeed?.support_purpose ?? '').trim()
        const contextLine = [
          profileSeed?.region?.trim() && `지역: ${profileSeed.region}`,
          profileSeed?.city?.trim() && `시군구: ${profileSeed.city}`,
          profileSeed?.business_age_years != null &&
            Number.isFinite(profileSeed.business_age_years) &&
            `업력: ${profileSeed.business_age_years}년`,
          profileSeed?.startup_stage?.trim() && `창업단계: ${profileSeed.startup_stage}`,
          profileSeed?.annual_revenue_krw != null &&
            profileSeed.annual_revenue_krw > 0 &&
            `연매출(참고): ${profileSeed.annual_revenue_krw.toLocaleString('ko-KR')}원`,
          profileSeed?.tax_arrears === true ? '세금 체납: 있음' : profileSeed?.tax_arrears === false ? '세금 체납: 없음' : '',
        ]
          .filter(Boolean)
          .join(' | ')
        if (purpose && contextLine) return `${purpose}\n\n(기업 기초정보: ${contextLine})`
        if (purpose) return purpose
        if (contextLine) return `기업 기초정보: ${contextLine}`
        return ''
      })

      if (pid && programSeed?.title) {
        setJourneyHint('선택한 공고 정보와 최근 입력값을 자동 반영했습니다. 필요하면 수정 후 생성하세요.')
      } else if (pid && !programSeed) {
        setJourneyHint('공고 ID로 저장된 정보를 찾지 못했습니다. 공고명·내용을 직접 입력해 주세요.')
      } else if (seededCount > 0) {
        setJourneyHint('최근 검색·마이페이지 입력값을 자동 반영했습니다. 필요하면 수정 후 생성하세요.')
      }
    }

    void hydrateFromJourney()
    return () => {
      cancelled = true
    }
  }, [searchKey, supabase])

  const handleGenerate = async () => {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`)
      return
    }
    if (!title) {
      setGenerateError('공고명을 입력하세요.')
      return
    }
    setLoading(true)
    setGenerateError('')
    setPlanResult(null)
    setChecklistResult(null)
    setTimelineResult(null)
    try {
      if (tab === 'plan') {
        const res = await fetch('/api/documents/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            announcementTitle: title,
            announcementText: announcementText || title,
            template,
            program_id: programId || undefined,
            requestedAmount: requestedAmount ? Number(requestedAmount) : undefined,
            companyProfile: {
              companyName: companyName || undefined,
              industry: industry || undefined,
              employeeCount: employeeCount ? Number(employeeCount) : undefined,
              problemStatement: problemStatement || undefined,
              solution: solution || undefined,
            },
          }),
        })
        const data = await res.json()
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(loginNext)}`)
          return
        }
        if (!res.ok || data.ok === false) {
          throw new Error(readApiError(data, '사업계획서 생성에 실패했습니다.'))
        }
        if (!Array.isArray(data.sections)) {
          throw new Error('생성 결과 형식이 올바르지 않습니다.')
        }
        setPlanResult(data)
      } else if (tab === 'checklist') {
        if (!announcementText) {
          setGenerateError('공고 내용을 입력하세요.')
          return
        }
        const res = await fetch('/api/documents/checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ program_id: programId || undefined, announcementTitle: title, announcementText, deadline, businessType }),
        })
        const data = await res.json()
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(loginNext)}`)
          return
        }
        if (!res.ok || data.ok === false) {
          throw new Error(readApiError(data, '서류 체크리스트 생성에 실패했습니다.'))
        }
        setChecklistResult(data)
      } else {
        if (!deadline) {
          setGenerateError('마감일을 입력하세요.')
          return
        }
        const res = await fetch('/api/documents/timeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            program_id: programId || undefined,
            announcementTitle: title,
            deadline,
            startDate: applicationStartDate || undefined,
          }),
        })
        const data = await res.json()
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(loginNext)}`)
          return
        }
        if (!res.ok || data.ok === false) {
          throw new Error(readApiError(data, '신청 타임라인 생성에 실패했습니다.'))
        }
        setTimelineResult(data)
      }
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : '문서 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const hasResult = (tab === 'plan' && planResult) || (tab === 'checklist' && checklistResult) || (tab === 'timeline' && timelineResult)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">신청 준비 문서 생성</h1>
          <p className="text-sm text-gray-500 mt-1">사업계획서 초안 · 서류 체크리스트 · 신청 일정을 자동 생성합니다</p>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border p-1">
          {([['plan', '사업계획서 초안', FileText], ['checklist', '서류 체크리스트', CheckSquare], ['timeline', '신청 타임라인', Calendar]] as [Tab, string, React.ElementType][]).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {/* 입력 폼 */}
        <div className="bg-white rounded-xl border p-5 mb-4">
          {journeyHint && (
            <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-xs text-blue-700">{journeyHint}</p>
            </div>
          )}
          {authChecked && !isLoggedIn && (
            <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
              <p className="text-sm font-medium text-indigo-900">
                문서 AI 생성은 로그인 후 이용할 수 있어요
              </p>
              <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                베타 기간에는 로그인만 하시면 사업계획서 초안·서류 체크리스트·신청 타임라인을 모두 사용할 수
                있습니다. 아래에서 내용을 확인한 뒤 로그인해 주세요.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(loginNext)}`}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                로그인하고 생성하기
              </Link>
            </div>
          )}
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">공고명 *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="예: 2026년 창업도약패키지 지원사업"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {tab !== 'timeline' && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">공고 내용 {tab === 'checklist' ? '*' : '(선택)'}</label>
                <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} rows={4}
                  placeholder="공고문의 지원 내용, 자격 요건, 서류 등을 붙여넣으세요"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">마감일 {tab === 'timeline' ? '*' : '(선택)'}</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {tab !== 'plan' && (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">기업 형태</label>
                  <select value={businessType} onChange={e => setBusinessType(e.target.value as '법인' | '개인')}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="법인">법인</option>
                    <option value="개인">개인</option>
                  </select>
                </div>
              )}
            </div>

            {/* 사업계획서 추가 입력 */}
            {tab === 'plan' && (
              <>
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-gray-500 mb-2">템플릿 선택</p>
                  <div className="flex gap-2">
                    {([['gov', '정부보조금 공문서 (6섹션)'], ['psst', 'PSST 창업패키지 (4축)']] as ['gov' | 'psst', string][]).map(([t, l]) => (
                      <button key={t} onClick={() => setTemplate(t)}
                        className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${template === t ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">회사명</label>
                    <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="(주)회사명" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">업종</label>
                    <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="IT/소프트웨어" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">신청 희망금액 (원)</label>
                    <input type="number" value={requestedAmount} onChange={e => setRequestedAmount(e.target.value)} placeholder="50000000" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">직원 수</label>
                    <input type="number" value={employeeCount} onChange={e => setEmployeeCount(e.target.value)} placeholder="10" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">해결 문제</label>
                  <textarea value={problemStatement} onChange={e => setProblemStatement(e.target.value)} rows={2} placeholder="우리 기업이 해결하고자 하는 시장 문제를 서술하세요" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">핵심 솔루션</label>
                  <textarea value={solution} onChange={e => setSolution(e.target.value)} rows={2} placeholder="우리 기업의 차별화된 해결 방법을 서술하세요" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </>
            )}
          </div>

          {generateError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {generateError}
            </div>
          )}

          <button onClick={handleGenerate} disabled={loading}
            className={`mt-4 w-full py-3 rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${
              authChecked && !isLoggedIn
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : authChecked && !isLoggedIn ? (
              <>
                <LogIn className="h-4 w-4" />
                로그인 후 생성하기
              </>
            ) : (
              '생성하기'
            )}
          </button>
        </div>

        {/* 결과 */}
        {!loading && hasResult && (
          <>
            {tab === 'plan' && planResult && <PlanResult result={planResult} />}
            {tab === 'checklist' && checklistResult && <ChecklistResult result={checklistResult} />}
            {tab === 'timeline' && timelineResult && <TimelineResult result={timelineResult} />}

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 leading-relaxed">⚠️ {LEGAL_DISCLAIMER}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function DocumentPlanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <DocumentPlanContent />
    </Suspense>
  )
}

function PlanResult({ result }: { result: { sections: Section[]; draftMeta: { missingData: string[]; confidence: number } } }) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const confidencePct = Math.round((result.draftMeta?.confidence ?? 0) * 100)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-white rounded-xl border p-4">
        <div>
          <p className="text-sm font-medium text-gray-800">초안 완성도</p>
          <p className="text-xs text-gray-500 mt-0.5">입력 정보 기준 {confidencePct}% 완성</p>
        </div>
        <div className="text-2xl font-bold text-blue-600">{confidencePct}%</div>
      </div>
      {result.draftMeta?.missingData?.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs font-medium text-orange-700 mb-1">추가 입력이 필요한 항목</p>
          {result.draftMeta.missingData.map((m, i) => <p key={i} className="text-xs text-orange-600">• {m}</p>)}
        </div>
      )}
      {result.sections?.map((s, i) => (
        <div key={i} className="bg-white rounded-xl border overflow-hidden">
          <button onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <span className="font-medium text-gray-800 text-sm">{s.order ? `${s.order}. ` : ''}{s.title}</span>
            {expanded === i ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {expanded === i && (
            <div className="px-4 pb-4 border-t">
              {s.guideline && <p className="text-xs text-blue-600 mt-3 mb-2 bg-blue-50 rounded p-2">{s.guideline}</p>}
              {s.draft && <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded p-3">{s.draft}</pre>}
              {s.subsections?.map((sub, j) => (
                <div key={j} className="mt-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">{sub.title}</p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded p-3">{sub.draft}</pre>
                </div>
              ))}
              {s.fillInRequired && s.fillInRequired.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-red-500 font-medium">✏️ 직접 입력 필요:</p>
                  {s.fillInRequired.map((f, k) => <p key={k} className="text-xs text-red-400">• {f}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ChecklistResult({ result }: { result: { checklist: ChecklistItem[]; totalDocuments: number; preparationLeadDays: number; tips: string[] } }) {
  const reqTypes = ['필수', '해당 시', '가점용', '기관 요청 시']
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-3 text-center"><p className="text-2xl font-bold text-blue-600">{result.totalDocuments}</p><p className="text-xs text-gray-500">총 서류</p></div>
        <div className="bg-white rounded-xl border p-3 text-center"><p className="text-2xl font-bold text-red-500">{result.checklist?.filter(c => c.requirementType === '필수').length}</p><p className="text-xs text-gray-500">필수 서류</p></div>
        <div className="bg-white rounded-xl border p-3 text-center"><p className="text-2xl font-bold text-orange-500">{result.preparationLeadDays}</p><p className="text-xs text-gray-500">준비 필요일</p></div>
      </div>
      {reqTypes.map(type => {
        const items = result.checklist?.filter(c => c.requirementType === type) ?? []
        if (!items.length) return null
        return (
          <div key={type} className="bg-white rounded-xl border p-4">
            <p className="text-sm font-semibold text-gray-800 mb-3">{type} 서류 ({items.length}건)</p>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.issuer} · 발급 {item.issuanceDays}일 소요</p>
                    {item.collectBy && <p className="text-xs text-blue-600">수집 기한: {item.collectBy}</p>}
                    {item.note && <p className="text-xs text-gray-400">{item.note}</p>}
                  </div>
                  {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex-shrink-0">발급<Download className="inline h-3 w-3 ml-0.5" /></a>}
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {result.tips && <div className="bg-blue-50 rounded-xl border border-blue-100 p-4"><p className="text-xs font-medium text-blue-700 mb-2">💡 준비 팁</p>{result.tips.map((t, i) => <p key={i} className="text-xs text-blue-600 mb-1">• {t}</p>)}</div>}
    </div>
  )
}

const URGENCY_COLOR: Record<string, string> = { 여유: 'bg-green-100 text-green-700', 보통: 'bg-yellow-100 text-yellow-700', 긴박: 'bg-red-100 text-red-700' }

function TimelineResult({ result }: { result: { milestones: Milestone[]; totalDaysLeft: number; warnings: string[]; tips: string[] } }) {
  const [expanded, setExpanded] = useState<number | null>(0)
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border p-4 flex items-center gap-4">
        <div><p className="text-3xl font-bold text-blue-600">D-{result.totalDaysLeft}</p><p className="text-xs text-gray-500">마감까지</p></div>
        {result.warnings?.map((w, i) => <p key={i} className="text-xs text-red-600 bg-red-50 rounded p-2 flex-1">{w}</p>)}
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        {result.milestones?.map((m, i) => (
          <div key={i} className="border-b last:border-0">
            <button onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left">
              <div className="w-16 text-center flex-shrink-0">
                <p className="text-xs font-bold text-gray-800">{m.date}</p>
                <p className="text-xs text-gray-400">{m.dow}요일</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{m.stage}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${URGENCY_COLOR[m.urgency] ?? 'bg-gray-100 text-gray-600'}`}>{m.urgency}</span>
                  {m.isWeekend && <span className="text-xs text-orange-500">주말</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
              </div>
              {expanded === i ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
            </button>
            {expanded === i && m.actionItems?.length > 0 && (
              <div className="px-4 pb-3 bg-gray-50">
                {m.actionItems.map((a, j) => <p key={j} className="text-xs text-gray-600 py-0.5">☑ {a}</p>)}
              </div>
            )}
          </div>
        ))}
      </div>
      {result.tips && <div className="bg-blue-50 rounded-xl border border-blue-100 p-4"><p className="text-xs font-medium text-blue-700 mb-2">💡 팁</p>{result.tips.map((t, i) => <p key={i} className="text-xs text-blue-600 mb-1">• {t}</p>)}</div>}
    </div>
  )
}
