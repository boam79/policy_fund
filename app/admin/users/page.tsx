'use client'
import { useEffect, useState } from 'react'
import { Loader2, Users, Crown } from 'lucide-react'

interface UserRow {
  id: string
  email: string
  created_at: string
  plan: string
  last_sign_in_at: string | null
}

const PLAN_COLOR: Record<string, string> = {
  free: 'text-gray-400 bg-gray-700',
  starter: 'text-blue-400 bg-blue-900/40',
  pro: 'text-indigo-400 bg-indigo-900/40',
  premium: 'text-purple-400 bg-purple-900/40',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await fetch('/api/admin/users')
        const json = await res.json()
        if (!res.ok) {
          throw new Error(String(json.error ?? '회원 데이터를 불러오지 못했습니다.'))
        }
        setUsers(json.users ?? [])
        setTotal(json.total ?? 0)
      } catch (err) {
        setUsers([])
        setTotal(0)
        setError(err instanceof Error ? err.message : '회원 데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />회원 관리
          <span className="text-sm font-normal text-gray-500 ml-1">총 {total}명</span>
        </h1>
      </div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {['이메일', '플랜', '가입일', '마지막 로그인'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500">회원이 없습니다</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                <td className="px-4 py-3 text-gray-200">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 w-fit ${PLAN_COLOR[u.plan] ?? PLAN_COLOR.free}`}>
                    {u.plan !== 'free' && <Crown className="h-3 w-3" />}
                    {u.plan?.toUpperCase() ?? 'FREE'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('ko-KR') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
