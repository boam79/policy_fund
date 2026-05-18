'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Loader2, Copy, Check, ExternalLink } from 'lucide-react'
import { readApiError } from '@/lib/api/readApiError'
import { getPlan, type PlanId } from '@/lib/billing/plans'

type DetailResponse = {
  user: {
    id: string
    email: string
    plan: PlanId
    subscription_status: string | null
    created_at: string
    last_sign_in_at: string | null
    usage: { eligibility_check: number; document_generate: number; evaluation: number }
  }
  usageLastMonth: { eligibility_check: number; document_generate: number; evaluation: number }
  businessProfile: Record<string, unknown> | null
  alertProfile: Record<string, unknown> | null
  inquiries: { id: string; subject: string; status: string; created_at: string }[]
  feedbackCount: number
  savedProgramsCount: number
  timeline: { label: string; at: string | null }[]
  beta: { openAccessEnabled: boolean; grantsFullAccess: boolean }
}

const PLANS: PlanId[] = ['free', 'starter', 'pro']

type Props = {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPlanUpdated?: () => void
}

export function UserDetailDrawer({ userId, open, onOpenChange, onPlanUpdated }: Props) {
  const [data, setData] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<'email' | 'id' | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(readApiError(json, '상세 정보를 불러오지 못했습니다.'))
      setData(json as DetailResponse)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : '오류')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (open && userId) void load()
  }, [open, userId, load])

  const copyText = async (text: string, kind: 'email' | 'id') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      /* ignore */
    }
  }

  const changePlan = async (plan_code: PlanId) => {
    if (!userId || !data) return
    if (!confirm(`플랜을 ${getPlan(plan_code).name}(으)로 변경할까요? (관리자 수동)`)) return
    setSavingPlan(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_code }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(readApiError(json, '플랜 변경 실패'))
      await load()
      onPlanUpdated?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : '플랜 변경 실패')
    } finally {
      setSavingPlan(false)
    }
  }

  const profile = data?.businessProfile
  const alertProfile = data?.alertProfile

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-white text-gray-900">
        <SheetHeader>
          <SheetTitle className="text-lg">회원 상세</SheetTitle>
          <SheetDescription>프로필·이용량·문의·플랜 관리</SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        )}
        {error && <p className="px-4 text-sm text-red-600">{error}</p>}

        {data && !loading && (
          <div className="space-y-5 px-4 pb-8">
            <div>
              <p className="text-sm font-medium text-gray-900 break-all">{data.user.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyText(data.user.email, 'email')}
                >
                  {copied === 'email' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  이메일
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyText(data.user.id, 'id')}
                >
                  {copied === 'id' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  UID
                </Button>
              </div>
            </div>

            {data.beta.openAccessEnabled && (
              <p className="text-xs rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2">
                베타 전체 이용 {data.beta.grantsFullAccess ? '적용 중' : '미적용'}
              </p>
            )}

            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">플랜 (관리자 수동)</h3>
              <div className="flex flex-wrap gap-2">
                {PLANS.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={data.user.plan === p ? 'default' : 'outline'}
                    disabled={savingPlan || data.user.plan === p}
                    onClick={() => void changePlan(p)}
                  >
                    {getPlan(p).name}
                  </Button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">상태: {data.user.subscription_status ?? '—'}</p>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">이번 달 / 지난 달 사용량</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border p-2">
                  <p className="text-gray-500">이번 달</p>
                  <p>
                    자격 {data.user.usage.eligibility_check} · 문서 {data.user.usage.document_generate} · 심사{' '}
                    {data.user.usage.evaluation}
                  </p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-gray-500">지난 달</p>
                  <p>
                    자격 {data.usageLastMonth.eligibility_check} · 문서 {data.usageLastMonth.document_generate} ·
                    심사 {data.usageLastMonth.evaluation}
                  </p>
                </div>
              </div>
            </section>

            {profile && (
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">기업 프로필</h3>
                <ul className="text-xs space-y-1 text-gray-700">
                  {profile.company_name != null && String(profile.company_name) && (
                    <li>회사: {String(profile.company_name)}</li>
                  )}
                  {profile.industry != null && <li>업종: {String(profile.industry)}</li>}
                  {profile.region != null && <li>지역: {String(profile.region)}</li>}
                  {profile.employee_count != null && <li>직원: {String(profile.employee_count)}명</li>}
                </ul>
              </section>
            )}

            {alertProfile && (
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">알림 설정</h3>
                <p className="text-xs text-gray-700">
                  {alertProfile.is_active ? '활성' : '비활성'}
                  {alertProfile.notify_new_programs ? ' · 신규 공고 알림' : ''}
                  {alertProfile.notify_days_before != null
                    ? ` · 마감 D-${String(alertProfile.notify_days_before)}`
                    : ''}
                </p>
              </section>
            )}

            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">활동 요약</h3>
              <p className="text-xs text-gray-700">
                찜한 공고 {data.savedProgramsCount} · 피드백 {data.feedbackCount}건
              </p>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">타임라인</h3>
              <ul className="text-xs space-y-1">
                {data.timeline.map((t) => (
                  <li key={t.label} className="flex justify-between gap-2">
                    <span className="text-gray-600">{t.label}</span>
                    <span>{t.at ? new Date(t.at).toLocaleString('ko-KR') : '—'}</span>
                  </li>
                ))}
              </ul>
            </section>

            {data.inquiries.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">최근 문의</h3>
                  <Link
                    href={`/admin/inquiries?q=${encodeURIComponent(data.user.email)}`}
                    className="text-xs text-indigo-600 inline-flex items-center gap-0.5"
                  >
                    전체 <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <ul className="text-xs space-y-2">
                  {data.inquiries.map((inq) => (
                    <li key={inq.id} className="border rounded-lg px-2 py-1.5">
                      <p className="font-medium truncate">{inq.subject}</p>
                      <p className="text-gray-500">
                        {inq.status} · {new Date(inq.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
