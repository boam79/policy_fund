'use client'

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import { buildKeywordSearchHref } from '@/lib/search/queryParams'

export type SearchBarParseResponse = {
  success?: boolean
  ok?: boolean
  error_code?: string
  message?: string
  error?: string
  data?: { parsed: ParseNLResult }
}

export async function createDiagnosisSessionPath(
  q: string,
  parsed: ParseNLResult
): Promise<string> {
  let diagnosisPath = `/diagnosis?q=${encodeURIComponent(q)}&data=${encodeURIComponent(JSON.stringify(parsed))}`
  try {
    const sessRes = await fetch('/api/diagnosis/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_query: q, parsed }),
    })
    const sessJson = (await sessRes.json()) as { ok?: boolean; sid?: string; token?: string }
    if (sessRes.ok && sessJson.ok === true && sessJson.sid && sessJson.token) {
      const params = new URLSearchParams({
        sid: sessJson.sid,
        token: sessJson.token,
        q,
      })
      diagnosisPath = `/diagnosis?${params.toString()}`
    }
  } catch {
    /* sid 저장 실패 시 data= URL 유지 */
  }
  return diagnosisPath
}

export async function submitNaturalLanguageSearch(
  q: string,
  router: AppRouterInstance
): Promise<{ ok: true; path: string } | { ok: false; error: string; showMiniForm?: boolean }> {
  const res = await fetch('/api/query/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  })

  const data = (await res.json()) as SearchBarParseResponse
  const parseSucceeded = res.ok && data.success === true && data.ok !== false && data?.data?.parsed != null

  if (!parseSucceeded) {
    const message = String(data.message ?? data.error ?? '')
    const isInputValidationError =
      res.status === 400 &&
      ['PARSE_INVALID_INPUT', 'PARSE_QUERY_TOO_LONG'].includes(String(data.error_code ?? ''))

    if (data.error_code === 'PARSE_QUOTA_EXCEEDED') {
      return {
        ok: false,
        error: message.length > 0 ? message : '오늘 AI 분석 횟수를 모두 사용했습니다.',
      }
    }

    if (isInputValidationError) {
      return {
        ok: false,
        error: message.length > 0 ? message : '검색어를 입력해주세요.',
        showMiniForm: true,
      }
    }

    if (!isInputValidationError && q.trim()) {
      router.push(buildKeywordSearchHref(q))
      return { ok: true, path: buildKeywordSearchHref(q) }
    }

    return {
      ok: false,
      error: message.length > 0 ? message : '조건 추출에 실패했습니다.',
    }
  }

  const parsed = data.data!.parsed
  if (typeof window !== 'undefined') {
    localStorage.setItem('pf:last_parsed', JSON.stringify(parsed))
  }

  const diagnosisPath = await createDiagnosisSessionPath(q, parsed)
  router.push(diagnosisPath)
  return { ok: true, path: diagnosisPath }
}

export function persistSearchQuery(q: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('pf:last_query', q)
  localStorage.setItem('pf:last_query_at', new Date().toISOString())
}
