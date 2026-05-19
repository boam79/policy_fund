'use client'

import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'

type Props = {
  parsed: Pick<ParseNLResult, 'raw_query' | 'summary'>
}

export function DiagnosisParsedBanner({ parsed }: Props) {
  return (
    <>
      <div className="mb-6 rounded-lg border bg-blue-50/50 p-4">
        <p className="text-xs font-medium text-muted-foreground">입력한 질문</p>
        <p className="mt-1 text-sm font-medium text-foreground">&ldquo;{parsed.raw_query}&rdquo;</p>
      </div>

      {parsed.summary && (
        <div className="mb-6 rounded-lg border-l-4 border-l-blue-500 bg-white p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">AI 분석 요약: </span>
            {parsed.summary}
          </p>
        </div>
      )}
    </>
  )
}
