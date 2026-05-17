'use client'
import { useEffect, useState } from 'react'
import { readApiError } from '@/lib/api/readApiError'
import {
  FileText,
  Search,
  CheckSquare,
  MessageSquare,
  RefreshCw,
  Loader2,
  TrendingUp,
  AlertCircle,
  Users,
  ThumbsDown,
  CreditCard,
  ThumbsUp,
} from 'lucide-react'
import Link from 'next/link'
import { AdminOpsPageShell } from '@/components/admin/AdminOpsPageShell'

interface KPI {
  totalPrograms: number
  activePrograms: number
  closingSoon: number
  totalSearches: number
  totalEligibility: number
  openInquiries: number
  pendingInquiries?: number
  processingInquiries?: number
  paidSubscribers?: number
  negativeFeedback7d?: number
}
interface SyncLog { id: string; source: string; status: string; requested_count: number; inserted_count: number; started_at: string; ended_at: string | null }
interface QualitySummary {
  region_null_pct: number
  industry_tags_empty_pct: number
  html_residual_pct: number
}

export default function AdminDashboard() {
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [quality, setQuality] = useState<QualitySummary | null>(null)
  const [syncs, setSyncs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [error, setError] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const [res, qualityRes] = await Promise.all([
        fetch('/api/admin/dashboard'),
        fetch('/api/admin/programs/quality'),
      ])
      const data = await res.json()
      if (!res.ok) {
        throw new Error(readApiError(data, '대시보드 데이터를 불러오지 못했습니다.'))
      }
      setKpi(data.kpi)
      setSyncs(data.recentSyncs ?? [])
      if (qualityRes.ok) {
        const q = await qualityRes.json()
        setQuality({
          region_null_pct: q.region_null_pct ?? 0,
          industry_tags_empty_pct: q.industry_tags_empty_pct ?? 0,
          html_residual_pct: q.html_residual_pct ?? 0,
        })
      } else {
        setQuality(null)
      }
    } catch (err) {
      setKpi(null)
      setQuality(null)
      setSyncs([])
      setError(err instanceof Error ? err.message : '대시보드 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
      })
      const data = await res.json()
      setSyncMsg(res.ok ? (data.message ?? '동기화 완료') : readApiError(data, '동기화 실패'))
      await loadData()
    } catch { setSyncMsg('오류가 발생했습니다') }
    finally { setSyncing(false) }
  }

  const customerKpi = kpi
    ? [
        {
          icon: MessageSquare,
          label: '미처리 문의',
          value: kpi.openInquiries,
          sub: `접수 ${kpi.pendingInquiries ?? 0} · 처리중 ${kpi.processingInquiries ?? 0}`,
          color: 'text-red-600',
          bg: 'bg-red-50',
          href: '/admin/inquiries',
        },
        {
          icon: Users,
          label: '유료 구독',
          value: kpi.paidSubscribers ?? 0,
          sub: 'Starter·Pro 활성',
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
          href: '/admin/users',
        },
        {
          icon: ThumbsDown,
          label: '부정 피드백',
          value: kpi.negativeFeedback7d ?? 0,
          sub: '최근 7일',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          href: '/admin/feedback',
        },
      ]
    : []

  const opsKpi = kpi
    ? [
        { icon: FileText, label: '전체 공고', value: kpi.totalPrograms, sub: `모집중 ${kpi.activePrograms}건`, color: 'text-blue-600', bg: 'bg-blue-50' },
        { icon: AlertCircle, label: '마감임박', value: kpi.closingSoon, sub: '7일 이내', color: 'text-orange-600', bg: 'bg-orange-50' },
        { icon: Search, label: '누적 검색', value: kpi.totalSearches, sub: '전체 기간', color: 'text-green-600', bg: 'bg-green-50' },
        { icon: CheckSquare, label: '자격 확인', value: kpi.totalEligibility, sub: '전체 기간', color: 'text-purple-600', bg: 'bg-purple-50' },
        { icon: TrendingUp, label: '마지막 동기화', value: syncs[0] ? `${syncs[0].inserted_count}건` : '-', sub: syncs[0]?.source ?? '-', color: 'text-gray-600', bg: 'bg-gray-50' },
      ]
    : []

  return (
    <AdminOpsPageShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-sm text-gray-500">고객 응대·이용 현황을 우선 확인하세요</p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          공고 동기화
        </button>
      </div>

      {syncMsg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${syncMsg.includes('완료') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {syncMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-indigo-700 mb-3">고객 현황</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {customerKpi.map(({ icon: Icon, label, value, sub, color, bg, href }) => (
              <Link key={label} href={href} className="bg-white rounded-xl border border-indigo-100 p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
                  <span className="text-sm text-gray-500">{label}</span>
                </div>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { href: '/admin/inquiries', label: '문의 관리', desc: '접수·상태 변경', icon: MessageSquare },
              { href: '/admin/users', label: '회원 관리', desc: '플랜·이용량', icon: Users },
              { href: '/admin/feedback', label: '피드백', desc: '만족도 분석', icon: ThumbsUp },
              { href: '/admin/billing', label: '결제 관리', desc: '구독·결제 이력', icon: CreditCard },
            ].map(({ href, label, desc, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <Icon className="h-5 w-5 text-indigo-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </Link>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-gray-600 mb-3">운영·공고</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {opsKpi.map(({ icon: Icon, label, value, sub, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <span className="text-sm text-gray-500">{label}</span>
                </div>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {quality && (
            <div className="mb-6 rounded-xl border bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">데이터 품질</h2>
                <div className="flex gap-3 text-xs">
                  <Link href="/admin/programs?quality=region_null" className="text-blue-500 hover:underline">
                    지역 미기재
                  </Link>
                  <Link href="/admin/programs?view=duplicates" className="text-blue-500 hover:underline">
                    중복 공고
                  </Link>
                  <Link href="/admin/recommendations" className="text-blue-500 hover:underline">
                    홈 배너
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs text-gray-500">지역 미기재</p>
                  <p className="text-lg font-semibold text-gray-900">{quality.region_null_pct}%</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs text-gray-500">업종 태그 없음</p>
                  <p className="text-lg font-semibold text-gray-900">{quality.industry_tags_empty_pct}%</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs text-gray-500">HTML 잔여(샘플)</p>
                  <p className="text-lg font-semibold text-gray-900">{quality.html_residual_pct}%</p>
                </div>
              </div>
            </div>
          )}

          {/* 최근 동기화 로그 */}
          <div className="bg-white rounded-xl border p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">최근 동기화 이력</h2>
              <Link href="/admin/sync" className="text-xs text-blue-500 hover:underline">전체 보기</Link>
            </div>
            {syncs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">동기화 이력이 없습니다. 동기화 버튼을 눌러 시작하세요.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-400 border-b">
                    <th className="pb-2 pr-4">출처</th><th className="pb-2 pr-4">상태</th>
                    <th className="pb-2 pr-4">수집</th><th className="pb-2 pr-4">저장</th>
                    <th className="pb-2">시작 시각</th>
                  </tr></thead>
                  <tbody>
                    {syncs.map(s => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{s.source}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              s.status === 'success'
                                ? 'bg-green-100 text-green-700'
                                : s.status === 'partial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-2 pr-4">{s.requested_count}</td>
                        <td className="py-2 pr-4">{s.inserted_count}</td>
                        <td className="py-2 text-gray-400">{new Date(s.started_at).toLocaleString('ko-KR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 운영 바로가기 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { href: '/admin/programs', label: '공고 목록', desc: '상태·노출·필터', icon: FileText },
              { href: '/admin/programs?view=duplicates', label: '중복 공고', desc: '제목·출처 중복', icon: FileText },
              { href: '/admin/sync', label: '동기화', desc: '공공 API 수집', icon: RefreshCw },
              { href: '/admin/recommendations', label: '홈 배너', desc: '추천 슬롯', icon: RefreshCw },
            ].map(({ href, label, desc, icon: Icon }) => (
              <Link key={href} href={href} className="bg-white rounded-xl border p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                <Icon className="h-5 w-5 text-gray-400 mb-2" />
                <p className="font-medium text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </AdminOpsPageShell>
  )
}
