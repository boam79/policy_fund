'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import type { ChecklistItem, DocumentPlanTab, Milestone, Section } from '@/components/documents/plan/documentPlanTypes'

export const LEGAL_DISCLAIMER =
  '본 문서 초안은 AI가 생성한 참고용 자료이며 법적 효력이 없습니다. 실제 제출 전 반드시 전문가 검토 및 공고문 기준에 맞게 수정하세요.'

type PlanSlice = {
  sections: Section[]
  draftMeta: { missingData: string[]; confidence: number }
}
type ChecklistSlice = {
  checklist: ChecklistItem[]
  totalDocuments: number
  preparationLeadDays: number
  tips: string[]
}
type TimelineSlice = {
  milestones: Milestone[]
  totalDaysLeft: number
  warnings: string[]
  tips: string[]
}

type Props = {
  tab: DocumentPlanTab
  loading: boolean
  planResult: PlanSlice | null
  checklistResult: ChecklistSlice | null
  timelineResult: TimelineSlice | null
}

export function PlanDocumentPreview({
  tab,
  loading,
  planResult,
  checklistResult,
  timelineResult,
}: Props) {
  const hasResult =
    (tab === 'plan' && planResult) || (tab === 'checklist' && checklistResult) || (tab === 'timeline' && timelineResult)

  if (loading || !hasResult) return null

  return (
    <>
      {tab === 'plan' && planResult && <PlanResult result={planResult} />}
      {tab === 'checklist' && checklistResult && <ChecklistResult result={checklistResult} />}
      {tab === 'timeline' && timelineResult && <TimelineResult result={timelineResult} />}

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800 leading-relaxed">⚠️ {LEGAL_DISCLAIMER}</p>
      </div>
    </>
  )
}

function PlanResult({ result }: { result: PlanSlice }) {
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
          {result.draftMeta.missingData.map((m, i) => (
            <p key={i} className="text-xs text-orange-600">
              • {m}
            </p>
          ))}
        </div>
      )}
      {result.sections?.map((s, i) => (
        <div key={i} className="bg-white rounded-xl border overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-800 text-sm">
              {s.order ? `${s.order}. ` : ''}
              {s.title}
            </span>
            {expanded === i ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {expanded === i && (
            <div className="px-4 pb-4 border-t">
              {s.guideline && (
                <p className="text-xs text-blue-600 mt-3 mb-2 bg-blue-50 rounded p-2">{s.guideline}</p>
              )}
              {s.draft && (
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded p-3">
                  {s.draft}
                </pre>
              )}
              {s.subsections?.map((sub, j) => (
                <div key={j} className="mt-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">{sub.title}</p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded p-3">
                    {sub.draft}
                  </pre>
                </div>
              ))}
              {s.fillInRequired && s.fillInRequired.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-red-500 font-medium">✏️ 직접 입력 필요:</p>
                  {s.fillInRequired.map((f, k) => (
                    <p key={k} className="text-xs text-red-400">
                      • {f}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ChecklistResult({ result }: { result: ChecklistSlice }) {
  const reqTypes = ['필수', '해당 시', '가점용', '기관 요청 시']
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{result.totalDocuments}</p>
          <p className="text-xs text-gray-500">총 서류</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold text-red-500">{result.checklist?.filter((c) => c.requirementType === '필수').length}</p>
          <p className="text-xs text-gray-500">필수 서류</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-2xl font-bold text-orange-500">{result.preparationLeadDays}</p>
          <p className="text-xs text-gray-500">준비 필요일</p>
        </div>
      </div>
      {reqTypes.map((type) => {
        const items = result.checklist?.filter((c) => c.requirementType === type) ?? []
        if (!items.length) return null
        return (
          <div key={type} className="bg-white rounded-xl border p-4">
            <p className="text-sm font-semibold text-gray-800 mb-3">{type} 서류 ({items.length}건)</p>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.issuer} · 발급 {item.issuanceDays}일 소요
                    </p>
                    {item.collectBy && <p className="text-xs text-blue-600">수집 기한: {item.collectBy}</p>}
                    {item.note && <p className="text-xs text-gray-400">{item.note}</p>}
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex-shrink-0"
                    >
                      발급
                      <Download className="inline h-3 w-3 ml-0.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {result.tips && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-xs font-medium text-blue-700 mb-2">💡 준비 팁</p>
          {result.tips.map((t, i) => (
            <p key={i} className="text-xs text-blue-600 mb-1">
              • {t}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

const URGENCY_COLOR: Record<string, string> = {
  여유: 'bg-green-100 text-green-700',
  보통: 'bg-yellow-100 text-yellow-700',
  긴박: 'bg-red-100 text-red-700',
}

function TimelineResult({ result }: { result: TimelineSlice }) {
  const [expanded, setExpanded] = useState<number | null>(0)
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border p-4 flex items-center gap-4">
        <div>
          <p className="text-3xl font-bold text-blue-600">D-{result.totalDaysLeft}</p>
          <p className="text-xs text-gray-500">마감까지</p>
        </div>
        {result.warnings?.map((w, i) => (
          <p key={i} className="text-xs text-red-600 bg-red-50 rounded p-2 flex-1">
            {w}
          </p>
        ))}
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        {result.milestones?.map((m, i) => (
          <div key={i} className="border-b last:border-0">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-16 text-center flex-shrink-0">
                <p className="text-xs font-bold text-gray-800">{m.date}</p>
                <p className="text-xs text-gray-400">{m.dow}요일</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{m.stage}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${URGENCY_COLOR[m.urgency] ?? 'bg-gray-100 text-gray-600'}`}>
                    {m.urgency}
                  </span>
                  {m.isWeekend && <span className="text-xs text-orange-500">주말</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
              </div>
              {expanded === i ? (
                <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </button>
            {expanded === i && m.actionItems?.length > 0 && (
              <div className="px-4 pb-3 bg-gray-50">
                {m.actionItems.map((a, j) => (
                  <p key={j} className="text-xs text-gray-600 py-0.5">
                    ☑ {a}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {result.tips && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-xs font-medium text-blue-700 mb-2">💡 팁</p>
          {result.tips.map((t, i) => (
            <p key={i} className="text-xs text-blue-600 mb-1">
              • {t}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
