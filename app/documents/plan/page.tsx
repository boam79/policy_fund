'use client'

import { useState } from 'react'
import { FileText, Calendar, CheckSquare, ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react'

type Tab = 'plan' | 'checklist' | 'timeline'

interface Section { order?: number; title: string; draft?: string; guideline?: string; fillInRequired?: string[]; subsections?: { title: string; draft: string; fillInRequired?: string[] }[] }
interface ChecklistItem { name: string; issuer: string; issuanceDays: number; collectBy?: string; url?: string; note?: string; requirementType: string; isStandardDocument: boolean }
interface Milestone { stage: string; date: string; dow: string; isWeekend: boolean; description: string; actionItems: string[]; urgency: string }

const LEGAL_DISCLAIMER = '본 문서 초안은 AI가 생성한 참고용 자료이며 법적 효력이 없습니다. 실제 제출 전 반드시 전문가 검토 및 공고문 기준에 맞게 수정하세요.'

export default function DocumentPlanPage() {
  const [tab, setTab] = useState<Tab>('plan')
  const [template, setTemplate] = useState<'gov' | 'psst'>('gov')
  const [loading, setLoading] = useState(false)

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

  const handleGenerate = async () => {
    if (!title) { alert('공고명을 입력하세요'); return }
    setLoading(true)
    try {
      if (tab === 'plan') {
        const res = await fetch('/api/documents/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            announcementTitle: title,
            announcementText: announcementText || title,
            template,
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
        setPlanResult(data)
      } else if (tab === 'checklist') {
        if (!announcementText) { alert('공고 내용을 입력하세요'); setLoading(false); return }
        const res = await fetch('/api/documents/checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcementTitle: title, announcementText, deadline, businessType }),
        })
        const data = await res.json()
        setChecklistResult(data)
      } else {
        if (!deadline) { alert('마감일을 입력하세요'); setLoading(false); return }
        const res = await fetch('/api/documents/timeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcementTitle: title, deadline }),
        })
        const data = await res.json()
        setTimelineResult(data)
      }
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
                    <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="(주)폴리시펀드" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

          <button onClick={handleGenerate} disabled={loading}
            className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />생성 중...</> : '생성하기'}
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
