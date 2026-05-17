'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import { fetchMyBusinessProfileDefaults } from '@/lib/profile/fetch-my-business-profile'
import { buildDefaultSearchQueryFromProfile } from '@/lib/profile/business-profile-defaults'
import ParseFallbackMiniForm from '@/components/home/ParseFallbackMiniForm'

const EXAMPLE_QUERIES = [
  '경기도 제조업 3년차 직원 5명인데 받을 수 있는 지원사업 찾아줘',
  '서울 IT 스타트업 창업 1년 미만, 사업화 자금 5000만원 필요',
  '부산 소상공인 음식업 10년차, 시설 개선 자금 지원 원해',
]

interface SearchBarProps {
  placeholder?: string
  size?: 'default' | 'large'
  /** 로그인 시 마이페이지 기업 기초정보로 검색문 채우기 안내 */
  useSavedProfileDefaults?: boolean
}

export default function SearchBar({
  placeholder = '예: 경기도 제조업 3년차인데 받을 수 있는 정책자금 찾아줘',
  size = 'default',
  useSavedProfileDefaults = true,
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showParseMiniForm, setShowParseMiniForm] = useState(false)
  const [savedProfileQuery, setSavedProfileQuery] = useState<string | null>(null)
  const router = useRouter()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!useSavedProfileDefaults) return
    let cancelled = false
    ;(async () => {
      try {
        const row = await fetchMyBusinessProfileDefaults()
        if (cancelled || !row) return
        const q = buildDefaultSearchQueryFromProfile(row)
        if (q) setSavedProfileQuery(q)
      } catch {
        /* 비로그인·네트워크 오류 무시 */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [useSavedProfileDefaults])

  async function handleSearch(searchQuery?: string) {
    const q = (searchQuery ?? query).trim()
    if (!q) {
      inputRef.current?.focus()
      return
    }

    setLoading(true)
    setError(null)
    setShowParseMiniForm(false)

    // 유저 여정 연결을 위한 최근 입력값 저장 (문서 생성 화면에서 활용)
    if (typeof window !== 'undefined') {
      localStorage.setItem('pf:last_query', q)
      localStorage.setItem('pf:last_query_at', new Date().toISOString())
    }

    try {
      const res = await fetch('/api/query/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })

      const data = await res.json() as {
        success?: boolean
        ok?: boolean
        error_code?: string
        message?: string
        error?: string
        data?: { parsed: ParseNLResult }
      }

      const parseSucceeded = res.ok && data.success === true && data.ok !== false && data?.data?.parsed != null

      if (!parseSucceeded) {
        const message = String(data.message ?? data.error ?? '')
        const isInputValidationError =
          res.status === 400 &&
          ['PARSE_INVALID_INPUT', 'PARSE_QUERY_TOO_LONG'].includes(String(data.error_code ?? ''))

        // 비어 있거나 잘못된 입력이 아니면 분석 단계 장애와 관계 없이 공고 검색으로 이어짐
        if (isInputValidationError) {
          setShowParseMiniForm(true)
          setError(message.length > 0 ? message : '검색어를 입력해주세요.')
          return
        }

        if (!isInputValidationError && q.trim()) {
          router.push(`/search?keyword=${encodeURIComponent(q)}&q=${encodeURIComponent(q)}`)
          return
        }

        setError(message.length > 0 ? message : '조건 추출에 실패했습니다.')
        return
      }

      const parsed: ParseNLResult = data.data!.parsed

      if (typeof window !== 'undefined') {
        localStorage.setItem('pf:last_parsed', JSON.stringify(parsed))
      }

      let diagnosisPath = `/diagnosis?q=${encodeURIComponent(q)}&data=${encodeURIComponent(JSON.stringify(parsed))}`
      try {
        const sessRes = await fetch('/api/diagnosis/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw_query: q, parsed }),
        })
        const sessJson = (await sessRes.json()) as { ok?: boolean; sid?: string }
        if (sessRes.ok && sessJson.ok === true && sessJson.sid) {
          diagnosisPath = `/diagnosis?sid=${encodeURIComponent(sessJson.sid)}&q=${encodeURIComponent(q)}`
        }
      } catch {
        /* sid 저장 실패 시 data= URL 유지 */
      }
      router.push(diagnosisPath)
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const isLarge = size === 'large'

  return (
    <div className="w-full">
      {/* 검색창 */}
      <div className={cn(
        'flex gap-2 rounded-xl border bg-white shadow-lg',
        isLarge ? 'p-3' : 'p-2'
      )}>
        <textarea
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setError(null)
            setShowParseMiniForm(false)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={isLarge ? 3 : 2}
          disabled={loading}
          className={cn(
            'flex-1 resize-none bg-transparent outline-none placeholder:text-muted-foreground',
            isLarge ? 'px-3 py-2 text-base' : 'px-2 py-1.5 text-sm'
          )}
        />
        <button
          onClick={() => handleSearch()}
          disabled={loading || !query.trim()}
          className={cn(
            buttonVariants({ size: isLarge ? 'default' : 'sm' }),
            'self-end shrink-0',
            (!query.trim() || loading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className={isLarge ? 'ml-1.5' : 'ml-1 hidden sm:inline'}>
            {loading ? '분석 중...' : '검색'}
          </span>
        </button>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}

      {showParseMiniForm && (
        <ParseFallbackMiniForm
          lastQuery={query}
          onKeywordSearch={(k) => router.push(`/search?keyword=${encodeURIComponent(k)}&q=${encodeURIComponent(k)}`)}
        />
      )}

      {/* 마이페이지 기본 검색문 */}
      {savedProfileQuery && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-blue-900/80">
            마이페이지에 저장한 <strong>사업자 기초정보</strong>로 검색 문장을 채울 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery(savedProfileQuery)
              inputRef.current?.focus()
            }}
            disabled={loading}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            기업정보로 채우기
          </button>
        </div>
      )}

      {/* 예시 질문 칩 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setQuery(ex)
              handleSearch(ex)
            }}
            disabled={loading}
            className="rounded-full border bg-white px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {ex.length > 30 ? ex.slice(0, 30) + '…' : ex}
          </button>
        ))}
      </div>
    </div>
  )
}
