'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, Suspense, useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import { mergeSavedProfileIntoParsed } from '@/lib/profile/business-profile-defaults'
import { fetchMyBusinessProfileDefaults } from '@/lib/profile/fetch-my-business-profile'
import { applyDiagnosisSearchNavigation } from '@/lib/diagnosis/navigate'
import { DiagnosisConditionEditor } from '@/components/diagnosis/DiagnosisConditionEditor'
import { DiagnosisActionBar } from '@/components/diagnosis/DiagnosisActionBar'
import { DiagnosisParsedBanner } from '@/components/diagnosis/DiagnosisParsedBanner'
import {
  MISSING_LABELS,
  buildEffectiveEntries,
  conditionHasDisplayValue,
} from '@/components/diagnosis/diagnosisConditionUtils'

function DiagnosisContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [parsed, setParsed] = useState<ParseNLResult | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  /** 저장 전 임시 입력값 (한글 조합 중 UI가 바뀌지 않도록 editValues 와 분리) */
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const [editMode, setEditMode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sid = searchParams.get('sid')
    const dataParam = searchParams.get('data')
    if (!sid && !dataParam) {
      const programId = searchParams.get('program_id')
      if (programId) {
        router.replace(`/eligibility?program_id=${encodeURIComponent(programId)}`)
        return
      }
      setError('검색 조건이 없습니다. 홈으로 돌아가 검색해주세요.')
      return
    }

    let cancelled = false
    setError(null)

    async function applyParsed(data: ParseNLResult) {
      let merged = data
      try {
        const prof = await fetchMyBusinessProfileDefaults()
        if (!cancelled && prof) merged = mergeSavedProfileIntoParsed(data, prof)
      } catch {
        /* 프로필 없음·오류 시 원본만 사용 */
      }
      if (cancelled) return
      setParsed(merged)
      const initValues: Record<string, string> = {}
      Object.entries(merged.conditions).forEach(([key, cond]) => {
        if (cond) initValues[key] = String((cond as { value: unknown }).value)
      })
      setEditValues(initValues)
    }

    ;(async () => {
      try {
        if (sid) {
          const token = searchParams.get('token')?.trim()
          if (!token) {
            if (!cancelled) {
              setError('진단 링크가 만료되었거나 올바르지 않습니다. 홈에서 다시 검색해주세요.')
            }
            return
          }
          const res = await fetch(
            `/api/diagnosis/session?id=${encodeURIComponent(sid)}&token=${encodeURIComponent(token)}`
          )
          const json = (await res.json()) as { ok?: boolean; parsed?: ParseNLResult; message?: string }
          if (!res.ok || !json.parsed) {
            if (!cancelled) {
              setError(String(json.message ?? '진단 세션을 불러올 수 없습니다. 홈에서 다시 검색해주세요.'))
            }
            return
          }
          await applyParsed(json.parsed)
          return
        }

        const data = JSON.parse(decodeURIComponent(dataParam!)) as ParseNLResult
        await applyParsed(data)
        try {
          const saveRes = await fetch('/api/diagnosis/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw_query: data.raw_query, parsed: data }),
          })
          const saveJson = (await saveRes.json()) as { sid?: string; token?: string }
          if (saveRes.ok && saveJson.sid && saveJson.token) {
            const params = new URLSearchParams({ sid: saveJson.sid, token: saveJson.token })
            router.replace(`/diagnosis?${params.toString()}`)
          }
        } catch {
          /* 레거시 ?data= URL 유지 */
        }
      } catch {
        if (!cancelled) setError('조건 데이터가 유효하지 않습니다.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, router])

  function navigateToSearch() {
    if (!parsed) {
      router.push('/search')
      return
    }
    applyDiagnosisSearchNavigation(router, parsed, editValues)
  }

  function beginEdit(key: string, initial = '') {
    setEditMode(key)
    setDraftValues((prev) => ({
      ...prev,
      [key]: prev[key] ?? editValues[key] ?? initial,
    }))
  }

  function handleEditSave(key: string) {
    const next = (draftValues[key] ?? editValues[key] ?? '').trim()
    if (next) {
      setEditValues((prev) => ({ ...prev, [key]: next }))
    }
    setEditMode(null)
  }

  function handleEditCancel() {
    setEditMode(null)
  }

  const effectiveEntries = useMemo(
    () => (parsed ? buildEffectiveEntries(parsed, editValues) : []),
    [parsed, editValues]
  )

  /** API/캐시 불일치 시에도 이미 추출·편집된 항목은 "추가 입력" 배지에서 제외 */
  const stillMissingImportant = useMemo(() => {
    if (!parsed) return []
    return parsed.missing_important.filter((k) => !conditionHasDisplayValue(parsed, editValues, k))
  }, [parsed, editValues])

  const uncertainExtractedKeys = useMemo(() => {
    return effectiveEntries
      .filter(([, c]) => c.confidence < 0.4)
      .map(([k]) => MISSING_LABELS[k] ?? k)
  }, [effectiveEntries])

  if (error) {
    const q = searchParams.get('q') ?? ''
    const searchHref = q ? `/search?keyword=${encodeURIComponent(q)}` : '/search'
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="mb-4 text-destructive">{error}</p>
        <div className="flex items-center justify-center gap-2">
          <Link href={searchHref} className={buttonVariants()}>
            실제 공고 검색으로 이동
          </Link>
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  if (!parsed) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Skeleton className="mb-4 h-8 w-64" />
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <DiagnosisParsedBanner parsed={parsed} />

      <DiagnosisConditionEditor
        parsed={parsed}
        effectiveEntries={effectiveEntries}
        stillMissingImportant={stillMissingImportant}
        editValues={editValues}
        setEditValues={setEditValues}
        draftValues={draftValues}
        setDraftValues={setDraftValues}
        editMode={editMode}
        beginEdit={beginEdit}
        handleEditSave={handleEditSave}
        handleEditCancel={handleEditCancel}
      />

      <DiagnosisActionBar
        parsed={parsed}
        editValues={editValues}
        onNavigateSearch={navigateToSearch}
        stillMissingImportant={stillMissingImportant}
        uncertainExtractedKeys={uncertainExtractedKeys}
        sid={searchParams.get('sid')}
        encodedData={searchParams.get('data')}
      />
    </div>
  )
}

// Suspense 래핑 (useSearchParams 요구사항)
export default function DiagnosisPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <Skeleton className="mb-4 h-8 w-64" />
          <div className="grid gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <DiagnosisContent />
    </Suspense>
  )
}
