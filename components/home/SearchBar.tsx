'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import { fetchMyBusinessProfileDefaults } from '@/lib/profile/fetch-my-business-profile'
import { buildDefaultSearchQueryFromProfile } from '@/lib/profile/business-profile-defaults'
import ParseFallbackMiniForm from '@/components/home/ParseFallbackMiniForm'
import { pushRecentSearch } from '@/components/home/RecentSearchChips'
import { buildKeywordSearchHref } from '@/lib/search/queryParams'
import { persistSearchQuery, submitNaturalLanguageSearch } from '@/lib/search/searchBarSubmit'

const EXAMPLE_QUERIES = [
  '경기도 제조업 3년차 직원 5명인데 받을 수 있는 지원사업 찾아줘',
  '서울 IT 스타트업 창업 1년 미만, 사업화 자금 5000만원 필요',
  '부산 소상공인 음식업 10년차, 시설 개선 자금 지원 원해',
]

interface SearchBarProps {
  placeholder?: string
  size?: 'default' | 'large'
  /** 목업 안 A: 한 줄 검색 + 우측 파란 검색 버튼 */
  layout?: 'default' | 'hero'
  /** 로그인 시 마이페이지 기업 기초정보로 검색문 채우기 안내 */
  useSavedProfileDefaults?: boolean
  /** 예시 질문 칩 숨김 */
  hideExamples?: boolean
}

export default function SearchBar({
  placeholder = '예: 경기도 제조업 3년차인데 받을 수 있는 정책자금 찾아줘',
  size = 'default',
  layout = 'default',
  useSavedProfileDefaults = true,
  hideExamples = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showParseMiniForm, setShowParseMiniForm] = useState(false)
  const [savedProfileQuery, setSavedProfileQuery] = useState<string | null>(null)
  const router = useRouter()
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

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

    if (typeof window !== 'undefined') {
      persistSearchQuery(q)
      pushRecentSearch(q)
    }

    try {
      const result = await submitNaturalLanguageSearch(q, router)
      if (!result.ok) {
        if (result.showMiniForm) setShowParseMiniForm(true)
        setError(result.error)
      }
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
  const isHero = layout === 'hero'

  return (
    <div className="w-full">
      <div
        className={cn(
          'flex items-center gap-2 border bg-white',
          isHero
            ? 'rounded-full border-slate-200 p-1.5 pl-5 shadow-lg'
            : cn('rounded-xl border-border/60 shadow-lg', isLarge ? 'p-3' : 'p-2')
        )}
      >
        {isHero ? (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setError(null)
              setShowParseMiniForm(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
            placeholder={placeholder}
            disabled={loading}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground md:text-base"
          />
        ) : (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
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
        )}
        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={loading || !query.trim()}
          className={cn(
            isHero
              ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
              : cn(
                  buttonVariants({ size: isLarge ? 'default' : 'sm' }),
                  'self-end shrink-0',
                  (!query.trim() || loading) && 'cursor-not-allowed opacity-50'
                )
          )}
          aria-label="검색"
        >
          {loading ? (
            <Loader2 className={cn('animate-spin', isHero ? 'h-5 w-5' : 'h-4 w-4')} />
          ) : (
            <Search className={isHero ? 'h-5 w-5' : 'h-4 w-4'} />
          )}
          {!isHero && (
            <span className={isLarge ? 'ml-1.5' : 'ml-1 hidden sm:inline'}>
              {loading ? '분석 중...' : '검색'}
            </span>
          )}
        </button>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="mt-2 space-y-1">
          <p className="text-sm text-destructive">{error}</p>
          {error.includes('AI 조건 분석') || error.includes('AI 분석') ? (
            <Link
              href="/support"
              className="inline-flex min-h-11 items-center text-xs font-medium text-rose-600 underline-offset-2 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label="후원하기, 토스 QR 안내 페이지로 이동"
            >
              후원하기
              <span aria-hidden> →</span>
            </Link>
          ) : null}
        </div>
      )}

      {showParseMiniForm && (
        <ParseFallbackMiniForm
          lastQuery={query}
          onKeywordSearch={(k) => router.push(buildKeywordSearchHref(k))}
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

      {!hideExamples && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((ex) => (
            <button
              key={ex}
              type="button"
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
      )}
    </div>
  )
}
