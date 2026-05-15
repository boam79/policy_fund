'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'

const EXAMPLE_QUERIES = [
  '경기도 제조업 3년차 직원 5명인데 받을 수 있는 지원사업 찾아줘',
  '서울 IT 스타트업 창업 1년 미만, 사업화 자금 5000만원 필요',
  '부산 소상공인 음식업 10년차, 시설 개선 자금 지원 원해',
]

interface SearchBarProps {
  placeholder?: string
  size?: 'default' | 'large'
}

export default function SearchBar({
  placeholder = '예: 경기도 제조업 3년차인데 받을 수 있는 정책자금 찾아줘',
  size = 'default',
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  async function handleSearch(searchQuery?: string) {
    const q = (searchQuery ?? query).trim()
    if (!q) {
      inputRef.current?.focus()
      return
    }

    setLoading(true)
    setError(null)

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

      // 추출 결과를 URL 파라미터로 인코딩 후 /diagnosis 페이지로 이동
      const params = new URLSearchParams({
        q: q,
        data: encodeURIComponent(JSON.stringify(parsed)),
      })
      router.push(`/diagnosis?${params.toString()}`)
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
