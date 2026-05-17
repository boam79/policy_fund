'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Copy } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'
import { stripHtmlToText } from '@/lib/utils/stripHtml'

interface DupProgram {
  id: string
  title: string
  source: string
  external_id: string | null
  status: string
  created_at: string
}

interface DupGroup {
  key: string
  title: string
  source: string
  count: number
  programs: DupProgram[]
}

export function ProgramsDuplicatesPanel() {
  const [groups, setGroups] = useState<DupGroup[]>([])
  const [policyNote, setPolicyNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        setLoading(true)
        setError('')
        const res = await fetch('/api/admin/programs/duplicates?limit=40')
        const data = await res.json()
        if (!res.ok) throw new Error(readApiError(data, '중복 목록을 불러오지 못했습니다.'))
        if (cancelled) return
        setGroups((data.groups ?? []) as DupGroup[])
        setPolicyNote(String(data.policy_note ?? ''))
      } catch (e) {
        if (!cancelled) {
          setGroups([])
          setError(e instanceof Error ? e.message : '오류')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-12 text-center text-gray-500">
        <Copy className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>동일 제목·출처 중복 그룹이 없습니다.</p>
      </div>
    )
  }

  return (
    <div>
      {policyNote && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {policyNote}
        </p>
      )}
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.key} className="rounded-xl border bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 truncate max-w-lg">
                  {stripHtmlToText(g.title)}
                </p>
                <p className="text-xs text-gray-500">
                  출처 {g.source} · {g.count}건
                </p>
              </div>
            </div>
            <ul className="divide-y">
              {g.programs.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                  <div>
                    <span className="text-xs text-gray-400 font-mono">{p.id.slice(0, 8)}…</span>
                    <span className="ml-2 text-gray-600">{p.status}</span>
                    <span className="ml-2 text-gray-400">
                      {new Date(p.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <Link
                    href={`/search/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline shrink-0"
                  >
                    상세 보기
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
