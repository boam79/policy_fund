'use client'
import { useEffect, useState } from 'react'
import { Loader2, CreditCard, TrendingUp } from 'lucide-react'
import type { Database } from '@/types/database.types'

type Payment = Database['public']['Tables']['payments']['Row']

const STATUS_COLOR: Record<string, string> = {
  done: 'text-green-400 bg-green-900/30',
  canceled: 'text-gray-400 bg-gray-700',
  failed: 'text-red-400 bg-red-900/30',
  pending: 'text-yellow-400 bg-yellow-900/30',
}
const STATUS_LABEL: Record<string, string> = { done: '완료', canceled: '취소', failed: '실패', pending: '처리중' }

export default function AdminBillingPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, done: 0, amount: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await fetch('/api/admin/billing')
        const json = await res.json()
        if (!res.ok) {
          throw new Error(String(json.error ?? '결제 데이터를 불러오지 못했습니다.'))
        }

        setPayments((json.payments ?? []) as Payment[])
        setStats(json.stats ?? { total: 0, done: 0, amount: 0 })
      } catch (err) {
        setPayments([])
        setStats({ total: 0, done: 0, amount: 0 })
        setError(err instanceof Error ? err.message : '결제 데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>

  return (
    <div>
      <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-6"><CreditCard className="h-5 w-5 text-blue-400" />결제 관리</h1>
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '전체 결제', value: `${stats.total}건`, icon: CreditCard },
          { label: '결제 완료', value: `${stats.done}건`, icon: TrendingUp },
          { label: '총 결제액', value: `${stats.amount.toLocaleString()}원`, icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {['주문번호', '상품', '금액', '상태', '결제일', '제공자'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">결제 이력이 없습니다</td></tr>
            ) : payments.map(p => (
              <tr key={p.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{p.order_id ?? '-'}</td>
                <td className="px-4 py-3 text-gray-200">{(p as Payment & { order_name?: string | null }).order_name ?? '-'}</td>
                <td className="px-4 py-3 text-white font-medium">{(p.amount_krw ?? 0).toLocaleString()}원</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[p.status] ?? ''}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{p.paid_at ? new Date(p.paid_at).toLocaleDateString('ko-KR') : '-'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{p.payment_provider ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
