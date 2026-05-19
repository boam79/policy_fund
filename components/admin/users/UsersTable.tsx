'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Loader2, Crown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { PlanId } from '@/lib/billing/plans'
import { getPlan } from '@/lib/billing/plans'

export interface AdminUserRow {
  id: string
  email: string
  created_at: string
  plan: PlanId
  subscription_status: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  last_sign_in_at: string | null
  usage: { eligibility_check: number; document_generate: number; evaluation: number }
}

const PLAN_COLOR: Record<string, string> = {
  free: 'text-gray-400 bg-gray-700',
  starter: 'text-blue-400 bg-blue-900/40',
  pro: 'text-indigo-400 bg-indigo-900/40',
}

const SUB_STATUS_LABEL: Record<string, string> = {
  active: '활성',
  trialing: '체험',
  canceled: '해지됨',
  past_due: '연체',
  unpaid: '미납',
}

type Props = {
  users: AdminUserRow[]
  loading: boolean
  page: number
  setPage: Dispatch<SetStateAction<number>>
  hasMore: boolean
  onOpenUser: (id: string) => void
}

export function UsersTable({ users, loading, page, setPage, hasMore, onOpenUser }: Props) {
  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          이전
        </button>
        <button
          type="button"
          disabled={!hasMore || loading}
          onClick={() => setPage((p) => p + 1)}
          className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white disabled:opacity-40"
        >
          다음
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-gray-700">
                {[
                  '이메일',
                  '플랜',
                  '구독 상태',
                  '다음 결제',
                  '해지',
                  '이번 달 사용량',
                  '가입일',
                  '마지막 로그인',
                ].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs text-gray-400 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    회원이 없습니다
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const plan = getPlan(u.plan)
                  const subLabel =
                    u.subscription_status != null
                      ? SUB_STATUS_LABEL[u.subscription_status] ?? u.subscription_status
                      : '—'
                  return (
                    <tr
                      key={u.id}
                      onClick={() => onOpenUser(u.id)}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2.5 text-gray-200 max-w-[220px] truncate" title={u.email}>
                        {u.email || '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${
                            PLAN_COLOR[u.plan] ?? PLAN_COLOR.free
                          }`}
                        >
                          {u.plan !== 'free' && <Crown className="h-3 w-3" />}
                          {plan.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-300 whitespace-nowrap">{subLabel}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {u.current_period_end ? new Date(u.current_period_end).toLocaleDateString('ko-KR') : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {u.cancel_at_period_end ? (
                          <span className="text-orange-300">예정</span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-400 leading-snug whitespace-nowrap">
                        자격 {u.usage.eligibility_check} · 문서 {u.usage.document_generate} · 심사 {u.usage.evaluation}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('ko-KR') : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
