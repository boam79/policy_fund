'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Radio, RefreshCw } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'
import { PRESENCE_ONLINE_MINUTES } from '@/lib/presence/config'

type OnlineUser = {
  id: string
  email: string
  last_seen_at: string
  last_path: string | null
  seconds_ago: number
}

type Props = {
  onSelectUser?: (userId: string) => void
}

export function OnlineUsersPanel({ onSelectUser }: Props) {
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')
      const res = await fetch('/api/admin/users/online')
      const json = await res.json()
      if (!res.ok) {
        throw new Error(readApiError(json, '접속자 목록을 불러오지 못했습니다.'))
      }
      setUsers(json.users ?? [])
    } catch (e) {
      setUsers([])
      setError(e instanceof Error ? e.message : '접속자 목록 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), 20_000)
    return () => clearInterval(id)
  }, [load])

  return (
    <section className="mb-6 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Radio className="h-4 w-4 text-emerald-600" />
            현재 접속
            <span className="text-emerald-700">{loading ? '…' : users.length}</span>
            <span className="font-normal text-gray-500">명</span>
          </h2>
        </div>
        <p className="text-xs text-gray-500">
          최근 {PRESENCE_ONLINE_MINUTES}분 이내 활동 · 20초마다 갱신
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            void load()
          }}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {loading && users.length === 0 ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">
          지금 접속 중으로 보이는 회원이 없습니다. (로그인 후 사이트를 이용 중인 회원만 표시됩니다)
        </p>
      ) : (
        <ul className="divide-y divide-emerald-100/80 rounded-lg border border-emerald-100 bg-white/80 max-h-48 overflow-y-auto">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onSelectUser?.(u.id)}
                className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-emerald-50/60 transition-colors"
              >
                <span className="font-medium text-gray-900 truncate max-w-[240px]">{u.email}</span>
                <span className="text-xs text-gray-500 shrink-0">
                  {u.seconds_ago < 60 ? '방금' : `${Math.floor(u.seconds_ago / 60)}분 전`}
                  {u.last_path ? ` · ${u.last_path}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
