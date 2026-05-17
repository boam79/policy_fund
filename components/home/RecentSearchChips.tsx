'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'pf:recent_searches'
const MAX = 6

function loadRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const legacy = localStorage.getItem('pf:last_query')?.trim()
      return legacy ? [legacy] : []
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, MAX)
  } catch {
    return []
  }
}

export function pushRecentSearch(query: string) {
  const q = query.trim()
  if (!q || typeof window === 'undefined') return
  const prev = loadRecent().filter((item) => item !== q)
  const next = [q, ...prev].slice(0, MAX)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  localStorage.setItem('pf:last_query', q)
}

export default function RecentSearchChips() {
  const [items, setItems] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    setItems(loadRecent())
  }, [])

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">최근 검색 기록이 없습니다.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => {
            localStorage.setItem('pf:last_query', q)
            router.push(`/search?q=${encodeURIComponent(q)}`)
          }}
          className="rounded-full border border-border/60 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-blue-300 hover:text-blue-700 transition-colors"
        >
          {q.length > 28 ? `${q.slice(0, 28)}…` : q}
        </button>
      ))}
    </div>
  )
}
