'use client'

import Link from 'next/link'
import { Loader2, LogIn } from 'lucide-react'

import type { DocumentPlanTab } from '@/components/documents/plan/documentPlanTypes'

type Props = {
  tab: DocumentPlanTab
  loginNext: string
  journeyHint: string
  authChecked: boolean
  isLoggedIn: boolean
  title: string
  setTitle: (v: string) => void
  announcementText: string
  setAnnouncementText: (v: string) => void
  deadline: string
  setDeadline: (v: string) => void
  businessType: '법인' | '개인'
  setBusinessType: (v: '법인' | '개인') => void
  template: 'gov' | 'psst'
  setTemplate: (v: 'gov' | 'psst') => void
  companyName: string
  setCompanyName: (v: string) => void
  industry: string
  setIndustry: (v: string) => void
  employeeCount: string
  setEmployeeCount: (v: string) => void
  problemStatement: string
  setProblemStatement: (v: string) => void
  solution: string
  setSolution: (v: string) => void
  requestedAmount: string
  setRequestedAmount: (v: string) => void
  generateError: string
  loading: boolean
  onGenerate: () => void | Promise<void>
}

export function PlanDocumentForm({
  tab,
  loginNext,
  journeyHint,
  authChecked,
  isLoggedIn,
  title,
  setTitle,
  announcementText,
  setAnnouncementText,
  deadline,
  setDeadline,
  businessType,
  setBusinessType,
  template,
  setTemplate,
  companyName,
  setCompanyName,
  industry,
  setIndustry,
  employeeCount,
  setEmployeeCount,
  problemStatement,
  setProblemStatement,
  solution,
  setSolution,
  requestedAmount,
  setRequestedAmount,
  generateError,
  loading,
  onGenerate,
}: Props) {
  return (
    <div className="bg-white rounded-xl border p-5 mb-4">
      {journeyHint && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <p className="text-xs text-blue-700">{journeyHint}</p>
        </div>
      )}
      {authChecked && !isLoggedIn && (
        <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-sm font-medium text-indigo-900">문서 AI 생성은 로그인 후 이용할 수 있어요</p>
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
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 2026년 창업도약패키지 지원사업"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {tab !== 'timeline' && (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              공고 내용 {tab === 'checklist' ? '*' : '(선택)'}
            </label>
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              rows={4}
              placeholder="공고문의 지원 내용, 자격 요건, 서류 등을 붙여넣으세요"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              마감일 {tab === 'timeline' ? '*' : '(선택)'}
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {tab !== 'plan' && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">기업 형태</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as '법인' | '개인')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="법인">법인</option>
                <option value="개인">개인</option>
              </select>
            </div>
          )}
        </div>

        {tab === 'plan' && (
          <>
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-gray-500 mb-2">템플릿 선택</p>
              <div className="flex gap-2">
                {(
                  [['gov', '정부보조금 공문서 (6섹션)'], ['psst', 'PSST 창업패키지 (4축)']] as [
                    'gov' | 'psst',
                    string,
                  ][]
                ).map(([t, l]) => (
                  <button
                    key={t}
                    onClick={() => setTemplate(t)}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                      template === t ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">회사명</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="(주)회사명"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">업종</label>
                <input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="IT/소프트웨어"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">신청 희망금액 (원)</label>
                <input
                  type="number"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  placeholder="50000000"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">직원 수</label>
                <input
                  type="number"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  placeholder="10"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">해결 문제</label>
              <textarea
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                rows={2}
                placeholder="우리 기업이 해결하고자 하는 시장 문제를 서술하세요"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">핵심 솔루션</label>
              <textarea
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                rows={2}
                placeholder="우리 기업의 차별화된 해결 방법을 서술하세요"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </>
        )}
      </div>

      {generateError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{generateError}</div>
      )}

      <button
        onClick={onGenerate}
        disabled={loading}
        className={`mt-4 w-full py-3 rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${
          authChecked && !isLoggedIn
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
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
  )
}
