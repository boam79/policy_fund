'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { FileText, Calendar, CheckSquare } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { stripHtmlToText } from '@/lib/utils/stripHtml'
import { readApiError } from '@/lib/api/readApiError'
import type { DocumentPlanTab, TabButtonDef } from '@/components/documents/plan/documentPlanTypes'
import { PlanDocumentForm } from '@/components/documents/plan/PlanDocumentForm'
import { PlanDocumentPreview } from '@/components/documents/plan/PlanDocumentPreview'

interface Section {
  order?: number
  title: string
  draft?: string
  guideline?: string
  fillInRequired?: string[]
  subsections?: { title: string; draft: string; fillInRequired?: string[] }[]
}
interface ChecklistItem {
  name: string
  issuer: string
  issuanceDays: number
  collectBy?: string
  url?: string
  note?: string
  requirementType: string
  isStandardDocument: boolean
}
interface Milestone {
  stage: string
  date: string
  dow: string
  isWeekend: boolean
  description: string
  actionItems: string[]
  urgency: string
}
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

const TAB_ROWS: TabButtonDef[] = [
  ['plan', '사업계획서 초안', FileText],
  ['checklist', '서류 체크리스트', CheckSquare],
  ['timeline', '신청 타임라인', Calendar],
]

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
  const [tab, setTab] = useState<DocumentPlanTab>('plan')
  const [template, setTemplate] = useState<'gov' | 'psst'>('gov')
  const [loading, setLoading] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [journeyHint, setJourneyHint] = useState('')
  const [programId, setProgramId] = useState('')

  const [title, setTitle] = useState('')
  const [announcementText, setAnnouncementText] = useState('')
  const [deadline, setDeadline] = useState('')
  const [businessType, setBusinessType] = useState<'법인' | '개인'>('법인')

  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [employeeCount, setEmployeeCount] = useState('')
  const [problemStatement, setProblemStatement] = useState('')
  const [solution, setSolution] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')

  const [planResult, setPlanResult] = useState<{ sections: Section[]; draftMeta: { missingData: string[]; confidence: number } } | null>(null)
  const [checklistResult, setChecklistResult] = useState<{ checklist: ChecklistItem[]; totalDocuments: number; preparationLeadDays: number; tips: string[] } | null>(
    null
  )
  const [timelineResult, setTimelineResult] = useState<{ milestones: Milestone[]; totalDaysLeft: number; warnings: string[]; tips: string[] } | null>(null)
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
            localParsed = Object.fromEntries(Object.entries(parsed.conditions ?? {}).map(([k, v]) => [k, v?.value]))
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
        (profileSeed?.industry as string | null) ?? programSeed?.industry ?? (cond.industry as string | undefined) ?? null
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
          profileSeed?.tax_arrears === true
            ? '세금 체납: 있음'
            : profileSeed?.tax_arrears === false
              ? '세금 체납: 없음'
              : '',
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
          body: JSON.stringify({
            program_id: programId || undefined,
            announcementTitle: title,
            announcementText,
            deadline,
            businessType,
          }),
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">신청 준비 문서 생성</h1>
          <p className="text-sm text-gray-500 mt-1">사업계획서 초안 · 서류 체크리스트 · 신청 일정을 자동 생성합니다</p>
        </div>

        <div className="flex gap-1 mb-6 bg-white rounded-xl border p-1">
          {TAB_ROWS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <PlanDocumentForm
          tab={tab}
          loginNext={loginNext}
          journeyHint={journeyHint}
          authChecked={authChecked}
          isLoggedIn={isLoggedIn}
          title={title}
          setTitle={setTitle}
          announcementText={announcementText}
          setAnnouncementText={setAnnouncementText}
          deadline={deadline}
          setDeadline={setDeadline}
          businessType={businessType}
          setBusinessType={setBusinessType}
          template={template}
          setTemplate={setTemplate}
          companyName={companyName}
          setCompanyName={setCompanyName}
          industry={industry}
          setIndustry={setIndustry}
          employeeCount={employeeCount}
          setEmployeeCount={setEmployeeCount}
          problemStatement={problemStatement}
          setProblemStatement={setProblemStatement}
          solution={solution}
          setSolution={setSolution}
          requestedAmount={requestedAmount}
          setRequestedAmount={setRequestedAmount}
          generateError={generateError}
          loading={loading}
          onGenerate={handleGenerate}
        />

        <PlanDocumentPreview
          tab={tab}
          loading={loading}
          planResult={planResult}
          checklistResult={checklistResult}
          timelineResult={timelineResult}
        />
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
