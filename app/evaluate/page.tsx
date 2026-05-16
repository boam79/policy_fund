'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Download, BarChart2, FileText } from 'lucide-react'
import { EXPORT_FILE_PREFIX } from '@/lib/site-config'
import { readApiError } from '@/lib/api/readApiError'
import { downloadEvaluationRows, flattenQualityForExport, flattenStartupForExport } from '@/lib/evaluate/resultExport'

type Tab = 'quality' | 'startup'

interface AxisDetail { name: string; score: number; maxScore: number; grade: string; findings: string[]; improvements: string[] }
interface QualityResult {
  summary: { weightedScore: number; grade: string; scoreBar: string; submitVerdict: string; submitPrediction: string }
  axisDetails: AxisDetail[]
  immediateFixes: string[]
  recommendedImprovements: string[]
  expectedQuestions: { questions: string[] }
  disclaimer: string
}
interface StartupAxisResult { axis: string; maxScore: number; score: number; grade: string; details: { criterion: string; maxPts: number; earnedPts: number; feedback: string }[]; strengths: string[]; improvements: string[] }
interface StartupResult {
  summary: { baseScore: number; bonusScore: number; totalScore: number; grade: string; label: string; prediction: string; scoreBar: string }
  axisResults: StartupAxisResult[]
  topPriorityImprovements: string[]
  finalChecklist: { item: string; required: boolean; done: boolean }[]
  disclaimer: string
}

const GRADE_COLOR: Record<string, string> = { S: 'text-purple-600', A: 'text-blue-600', B: 'text-green-600', C: 'text-yellow-600', D: 'text-red-600' }
const GRADE_BG: Record<string, string> = { S: 'bg-purple-50 border-purple-200', A: 'bg-blue-50 border-blue-200', B: 'bg-green-50 border-green-200', C: 'bg-yellow-50 border-yellow-200', D: 'bg-red-50 border-red-200' }

const LEGAL_DISCLAIMER = '본 결과는 입력 정보 기반 참고용 예측입니다. 실제 배점은 주관기관에 따라 다르며, 최종 판단은 심사위원의 종합 평가로 결정됩니다.'

export default function EvaluatePage() {
  const [tab, setTab] = useState<Tab>('quality')
  const [loading, setLoading] = useState(false)

  // quality inputs
  const [planText, setPlanText] = useState('')
  const [qProgramType, setQProgramType] = useState('예비창업패키지')
  const [qualityResult, setQualityResult] = useState<QualityResult | null>(null)

  // startup inputs
  const [programType, setProgramType] = useState('예비창업패키지')
  const [techDesc, setTechDesc] = useState('')
  const [diffDesc, setDiffDesc] = useState('')
  const [patentStatus, setPatentStatus] = useState('없음')
  const [customerValid, setCustomerValid] = useState('')
  const [revenueModel, setRevenueModel] = useState('')
  const [execPlan, setExecPlan] = useState('')
  const [budgetPlan, setBudgetPlan] = useState('')
  const [salesY1, setSalesY1] = useState('')
  const [salesY2, setSalesY2] = useState('')
  const [salesY3, setSalesY3] = useState('')
  const [tam, setTam] = useState('')
  const [competitorAnalysis, setCompetitorAnalysis] = useState('')
  const [founderBg, setFounderBg] = useState('')
  const [domainYears, setDomainYears] = useState('')
  const [teamComp, setTeamComp] = useState('')
  const [startupResult, setStartupResult] = useState<StartupResult | null>(null)

  const handleEvaluate = async () => {
    setLoading(true)
    try {
      if (tab === 'quality') {
        if (planText.length < 100) {
          alert('사업계획서 본문을 100자 이상 입력하세요')
          return
        }
        const res = await fetch('/api/evaluate/quality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planText, programType: qProgramType }),
        })
        const data = await res.json()
        if (!res.ok) {
          alert(readApiError(data))
          setQualityResult(null)
          return
        }
        if (data && typeof data === 'object' && data.ok === false) {
          alert(readApiError(data))
          setQualityResult(null)
          return
        }
        setQualityResult(data as QualityResult)
      } else {
        const res = await fetch('/api/evaluate/startup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programType,
            technologyDescription: techDesc || undefined,
            differentiationFromExisting: diffDesc || undefined,
            patentStatus,
            customerValidation: customerValid || undefined,
            revenueModel: revenueModel || undefined,
            executionPlanMonthly: execPlan || undefined,
            budgetPlan: budgetPlan || undefined,
            salesPlan3Year: {
              year1: salesY1 ? Number(salesY1) : undefined,
              year2: salesY2 ? Number(salesY2) : undefined,
              year3: salesY3 ? Number(salesY3) : undefined,
            },
            tam: tam || undefined,
            competitorAnalysis: competitorAnalysis || undefined,
            founderBackground: founderBg || undefined,
            domainExperienceYears: domainYears ? Number(domainYears) : undefined,
            teamComposition: teamComp || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          alert(readApiError(data))
          setStartupResult(null)
          return
        }
        if (data && typeof data === 'object' && data.ok === false) {
          alert(readApiError(data))
          setStartupResult(null)
          return
        }
        setStartupResult(data as StartupResult)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExportEvaluation = async (format: 'csv' | 'xlsx') => {
    const hasQuality = tab === 'quality' && qualityResult
    const hasStartup = tab === 'startup' && startupResult
    if (!hasQuality && !hasStartup) {
      alert('먼저 점수 예측을 실행하세요.')
      return
    }
    const rows =
      tab === 'quality' && qualityResult
        ? flattenQualityForExport(qualityResult)
        : tab === 'startup' && startupResult
          ? flattenStartupForExport(startupResult)
          : []
    if (!rows.length) {
      alert('보낼 결과 데이터가 없습니다.')
      return
    }
    await downloadEvaluationRows(format, rows, `${EXPORT_FILE_PREFIX}_심사결과_${tab}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">심사 점수 예측</h1>
          <p className="text-sm text-gray-500 mt-1">사업계획서 품질 측정 및 루브릭 심사 점수 예측</p>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border p-1">
          {([['quality', '품질 측정 (PSST)', FileText], ['startup', '루브릭 점수 예측', BarChart2]] as [Tab, string, React.ElementType][]).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {/* 입력 폼 */}
        <div className="bg-white rounded-xl border p-5 mb-4">
          {tab === 'quality' ? (
            <div className="grid gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">프로그램 유형</label>
                <select value={qProgramType} onChange={e => setQProgramType(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['예비창업패키지', '초기창업패키지', '창업도약패키지', '기타'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">사업계획서 전문 *<span className="text-gray-400 font-normal ml-1">(최소 100자)</span></label>
                <textarea value={planText} onChange={e => setPlanText(e.target.value)} rows={10}
                  placeholder="사업계획서 전문을 붙여넣으세요. 문제인식(Problem)·실현가능성(Solution)·성장전략(Scale-up)·팀구성(Team) 내용이 포함될수록 정확한 측정이 가능합니다."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <p className="text-xs text-gray-400 mt-1">{planText.length}자 입력됨</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">프로그램 유형</label>
                  <select value={programType} onChange={e => setProgramType(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['예비창업패키지', '초기창업패키지', '창업도약패키지'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">특허 현황</label>
                  <select value={patentStatus} onChange={e => setPatentStatus(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['없음', '출원중', '등록완료', '복수보유'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-500 pt-1 border-t">① 기술성·혁신성</p>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">기술 원리 설명</label>
                <textarea value={techDesc} onChange={e => setTechDesc(e.target.value)} rows={2} placeholder="핵심 기술의 작동 원리, 알고리즘, 정확도 등" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">기존 대비 차별화</label>
                <textarea value={diffDesc} onChange={e => setDiffDesc(e.target.value)} rows={2} placeholder="경쟁 제품 대비 차별점, 비교표 등" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">고객 검증 현황</label>
                <textarea value={customerValid} onChange={e => setCustomerValid(e.target.value)} rows={2} placeholder="MVP 테스트, PoC 결과, 파일럿 고객 수 등" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <p className="text-xs font-semibold text-gray-500 pt-1 border-t">② 사업성</p>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">수익 모델</label>
                <textarea value={revenueModel} onChange={e => setRevenueModel(e.target.value)} rows={2} placeholder="ARPU, 마진율, BEP 달성 시점 등" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[['1년차 매출(원)', salesY1, setSalesY1], ['2년차 매출(원)', salesY2, setSalesY2], ['3년차 매출(원)', salesY3, setSalesY3]].map(([label, val, setter]) => (
                  <div key={label as string}>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">{label as string}</label>
                    <input type="number" value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)} placeholder="0" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">월별 사업화 추진 일정</label>
                <textarea value={execPlan} onChange={e => setExecPlan(e.target.value)} rows={2} placeholder="1~3개월: MVP 개발, 4~6개월: 파일럿, 7~12개월: 상용화 등" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">지원금 집행 계획</label>
                <textarea value={budgetPlan} onChange={e => setBudgetPlan(e.target.value)} rows={2} placeholder="인건비 40%, 재료비 30%, 외주비 20% 등 비목별 명시" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <p className="text-xs font-semibold text-gray-500 pt-1 border-t">③ 시장성</p>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">TAM (전체 시장 규모)</label>
                <input value={tam} onChange={e => setTam(e.target.value)} placeholder="예: 국내 AI 시장 5조원 (출처: 통계청 2025)" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">경쟁사 분석</label>
                <textarea value={competitorAnalysis} onChange={e => setCompetitorAnalysis(e.target.value)} rows={2} placeholder="A사·B사 대비 비용 50% 절감, 처리 속도 3배 등" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <p className="text-xs font-semibold text-gray-500 pt-1 border-t">④ 창업자·팀 역량</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">도메인 경력 (년)</label>
                  <input type="number" value={domainYears} onChange={e => setDomainYears(e.target.value)} placeholder="5" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">창업자 배경</label>
                  <input value={founderBg} onChange={e => setFounderBg(e.target.value)} placeholder="전직 NHN 개발자 10년..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">팀 구성</label>
                <textarea value={teamComp} onChange={e => setTeamComp(e.target.value)} rows={2} placeholder="대표(기획/영업), CTO(개발), 디자이너 등 역할과 경력" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          )}

          <button onClick={handleEvaluate} disabled={loading}
            className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />분석 중...</> : '점수 예측하기'}
          </button>
        </div>

        {/* 결과 */}
        {!loading && tab === 'quality' && qualityResult && <QualityResultView result={qualityResult} />}
        {!loading && tab === 'startup' && startupResult && <StartupResultView result={startupResult} />}

        {/* 내보내기 */}
        <div className="mt-6 bg-white rounded-xl border p-4">
          <p className="text-sm font-medium text-gray-800 mb-3">심사 결과보내기 (CSV / XLSX)</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleExportEvaluation('csv')}
              className="flex items-center gap-1.5 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />CSV 다운로드
            </button>
            <button
              type="button"
              onClick={() => void handleExportEvaluation('xlsx')}
              className="flex items-center gap-1.5 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />XLSX 다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function QualityResultView({ result }: { result: QualityResult }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const g = result.summary?.grade ?? 'D'
  return (
    <div className="space-y-3 mb-4">
      <div className={`rounded-xl border p-5 ${GRADE_BG[g] ?? ''}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">종합 품질 점수</p>
            <p className={`text-4xl font-bold ${GRADE_COLOR[g] ?? ''}`}>{result.summary?.weightedScore}<span className="text-lg text-gray-400">/100</span></p>
            <p className={`text-xl font-bold ${GRADE_COLOR[g] ?? ''}`}>{g}등급</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{result.summary?.submitVerdict}</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">{result.summary?.submitPrediction}</p>
          </div>
        </div>
      </div>

      {result.immediateFixes?.length > 0 && result.immediateFixes[0] !== '즉시 수정 필요 항목 없음' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">⚡ 즉시 수정 필요</p>
          {result.immediateFixes.map((f, i) => <p key={i} className="text-xs text-red-600 mb-1">• {f}</p>)}
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <p className="text-sm font-medium text-gray-700 p-4 border-b">축별 상세 점수</p>
        {result.axisDetails?.map((axis, i) => (
          <div key={i} className="border-b last:border-0">
            <button onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`text-lg font-bold ${GRADE_COLOR[axis.grade] ?? ''}`}>{axis.grade}</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{axis.name}</p>
                  <p className="text-xs text-gray-400">{axis.score}/{axis.maxScore}점</p>
                </div>
              </div>
              {expanded === i ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {expanded === i && (
              <div className="px-4 pb-4 space-y-2">
                {axis.findings?.map((f, j) => <p key={j} className="text-xs text-green-600">✓ {f}</p>)}
                {axis.improvements?.map((im, j) => <p key={j} className="text-xs text-orange-600">→ {im}</p>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {result.expectedQuestions?.questions?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-700 mb-2">💬 심사위원 예상 질문</p>
          {result.expectedQuestions.questions.map((q, i) => <p key={i} className="text-xs text-blue-700 mb-1">Q{i + 1}. {q}</p>)}
        </div>
      )}

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">⚠️ {result.disclaimer ?? LEGAL_DISCLAIMER}</p>
      </div>
    </div>
  )
}

function StartupResultView({ result }: { result: StartupResult }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const g = result.summary?.grade ?? 'D'
  return (
    <div className="space-y-3 mb-4">
      <div className={`rounded-xl border p-5 ${GRADE_BG[g] ?? ''}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">예측 심사 점수</p>
            <p className={`text-4xl font-bold ${GRADE_COLOR[g] ?? ''}`}>
              {result.summary?.totalScore}<span className="text-lg text-gray-400">/105</span>
            </p>
            <p className={`font-semibold ${GRADE_COLOR[g] ?? ''}`}>{g}등급 · {result.summary?.label}</p>
          </div>
          <div className="text-right max-w-xs">
            <p className="text-xs text-gray-600">{result.summary?.prediction}</p>
            <p className="text-xs text-gray-400 mt-1">기본 {result.summary?.baseScore}점 + 가점 {result.summary?.bonusScore}점</p>
          </div>
        </div>
      </div>

      {result.topPriorityImprovements?.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-700 mb-2">🎯 우선 개선 항목</p>
          {result.topPriorityImprovements.map((p, i) => <p key={i} className="text-xs text-orange-600 mb-1">• {p}</p>)}
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <p className="text-sm font-medium text-gray-700 p-4 border-b">축별 점수 (5대 평가 기준)</p>
        {result.axisResults?.map((axis, i) => (
          <div key={i} className="border-b last:border-0">
            <button onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`text-lg font-bold ${GRADE_COLOR[axis.grade] ?? ''}`}>{axis.grade}</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{axis.axis}</p>
                  <p className="text-xs text-gray-400">{axis.score}/{axis.maxScore}점</p>
                </div>
              </div>
              {expanded === i ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {expanded === i && (
              <div className="px-4 pb-4 space-y-2">
                {axis.details?.map((d, j) => (
                  <div key={j} className="text-xs border-l-2 border-gray-200 pl-2">
                    <p className="font-medium text-gray-700">{d.criterion} ({d.earnedPts}/{d.maxPts}점)</p>
                    <p className="text-gray-500">{d.feedback}</p>
                  </div>
                ))}
                {axis.strengths?.length > 0 && <div className="pt-1">{axis.strengths.map((s, j) => <p key={j} className="text-xs text-green-600">✓ {s}</p>)}</div>}
                {axis.improvements?.length > 0 && <div>{axis.improvements.map((im, j) => <p key={j} className="text-xs text-orange-600">→ {im}</p>)}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {result.finalChecklist?.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">📋 제출 전 체크리스트</p>
          <div className="space-y-1.5">
            {result.finalChecklist.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-sm ${c.done ? 'text-green-500' : c.required ? 'text-red-400' : 'text-gray-300'}`}>
                  {c.done ? '✓' : c.required ? '✗' : '○'}
                </span>
                <span className={`text-xs ${c.done ? 'text-gray-700' : c.required ? 'text-red-600' : 'text-gray-400'}`}>{c.item}</span>
                {c.required && !c.done && <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded">필수</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">⚠️ {result.disclaimer ?? LEGAL_DISCLAIMER}</p>
      </div>
    </div>
  )
}
