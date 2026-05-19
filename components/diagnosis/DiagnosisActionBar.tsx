'use client'

import { Search, Zap } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import DiagnosisConfirmChips from '@/components/diagnosis/DiagnosisConfirmChips'
import { DiagnosisSaveProfileButton } from '@/components/diagnosis/DiagnosisSaveProfileButton'
import { buildDiagnosisQuickReportHref } from '@/lib/diagnosis/navigate'

type Props = {
  parsed: ParseNLResult
  editValues: Record<string, string>
  onNavigateSearch: () => void
  stillMissingImportant: string[]
  uncertainExtractedKeys: string[]
  sid: string | null
  encodedData: string | null
}

export function DiagnosisActionBar({
  parsed,
  editValues,
  onNavigateSearch,
  stillMissingImportant,
  uncertainExtractedKeys,
  sid,
  encodedData,
}: Props) {
  return (
    <>
      <DiagnosisConfirmChips parsed={parsed} editValues={editValues} onSearch={onNavigateSearch} />

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

      <p className="mb-8 rounded-lg bg-gray-50 px-4 py-3 text-xs text-muted-foreground">
        이 결과는 입력 조건을 기반으로 한 참고용 사전 분석입니다. 정확한 신청 가능 여부는 실제 공고 조건과
        주관기관 기준에 따라 달라질 수 있습니다.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={buildDiagnosisQuickReportHref(parsed, { sid, encodedData })}
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
          onClick={onNavigateSearch}
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
        <DiagnosisSaveProfileButton parsed={parsed} editValues={editValues} />
      </div>
    </>
  )
}
