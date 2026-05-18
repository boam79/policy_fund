'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  RefreshCw,
  MessageSquare,
  Settings,
  Star,
  CreditCard,
  ThumbsUp,
  Users,
  Headphones,
} from 'lucide-react'
import { SITE_NAME } from '@/lib/site-config'
import AdminTopBar from '@/components/admin/AdminTopBar'

type NavBadgeKey = 'inquiries' | 'feedback' | 'sync' | 'duplicates' | 'members'

type NavItem = {
  href: string
  icon: typeof Users
  label: string
  desc?: string
  badgeKey?: NavBadgeKey
}

type NavGroup = {
  label: string
  highlight?: boolean
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: '고객 센터',
    highlight: true,
    items: [
      {
        href: '/admin/inquiries',
        icon: MessageSquare,
        label: '문의 관리',
        desc: '접수·답변',
        badgeKey: 'inquiries',
      },
      {
        href: '/admin/users',
        icon: Users,
        label: '회원 관리',
        desc: '플랜·이용량',
        badgeKey: 'members',
      },
      {
        href: '/admin/feedback',
        icon: ThumbsUp,
        label: '피드백',
        desc: '만족도·개선',
        badgeKey: 'feedback',
      },
      { href: '/admin/billing', icon: CreditCard, label: '결제 관리', desc: '구독·결제' },
    ],
  },
  {
    label: '운영',
    highlight: true,
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: '대시보드' },
      {
        href: '/admin/programs',
        icon: FileText,
        label: '공고 관리',
        badgeKey: 'duplicates',
      },
      { href: '/admin/sync', icon: RefreshCw, label: '동기화', badgeKey: 'sync' },
      { href: '/admin/recommendations', icon: Star, label: '홈 배너 슬롯' },
    ],
  },
  {
    label: '시스템',
    items: [{ href: '/admin/settings', icon: Settings, label: '설정' }],
  },
]

function navActive(pathname: string, href: string) {
  if (pathname === href) return true
  return pathname.startsWith(`${href}/`)
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const [inquiryBadge, setInquiryBadge] = useState(0)
  const [feedbackBadge, setFeedbackBadge] = useState(0)
  const [syncBadge, setSyncBadge] = useState(0)
  const [duplicatesBadge, setDuplicatesBadge] = useState(0)
  const [membersBadge, setMembersBadge] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/nav-badges')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return
        setInquiryBadge(data.inquiries?.open ?? 0)
        setFeedbackBadge(data.negativeFeedback7d ?? 0)
        setSyncBadge(data.ops?.syncFailures48h ?? 0)
        setDuplicatesBadge(data.ops?.duplicateGroups ?? 0)
        setMembersBadge(data.members?.alert ?? 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [pathname])

  const badgeFor = (key?: NavBadgeKey) => {
    if (key === 'inquiries') return inquiryBadge
    if (key === 'feedback') return feedbackBadge
    if (key === 'sync') return syncBadge
    if (key === 'duplicates') return duplicatesBadge
    if (key === 'members') return membersBadge
    return 0
  }

  const customerPaths = navGroups[0].items.map((i) => i.href)
  const opsPaths = navGroups[1].items.map((i) => i.href)
  const onCustomerPage = customerPaths.some((href) => navActive(pathname, href))
  const onOpsPage = opsPaths.some((href) => navActive(pathname, href))

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-60 bg-gray-950 text-white flex flex-col fixed left-0 top-0 h-full z-40 border-r border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <Link href="/" className="text-sm font-bold text-white">
            {SITE_NAME}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5">관리자 콘솔</p>
        </div>

        <div className="px-3 pt-3 space-y-2">
          <Link
            href="/admin/inquiries"
            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              onCustomerPage
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : inquiryBadge > 0
                  ? 'bg-indigo-950/80 text-indigo-100 ring-1 ring-indigo-500/50'
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Headphones className="h-4 w-4 shrink-0" />
            <span className="flex-1">고객 응대 바로가기</span>
            {inquiryBadge > 0 && (
              <span className="min-w-[1.25rem] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                {inquiryBadge > 99 ? '99+' : inquiryBadge}
              </span>
            )}
          </Link>
          <Link
            href={syncBadge > 0 ? '/admin/sync' : '/admin/dashboard'}
            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              onOpsPage
                ? 'bg-slate-600 text-white shadow-lg shadow-slate-900/40'
                : syncBadge > 0
                  ? 'bg-amber-950/80 text-amber-100 ring-1 ring-amber-500/50'
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
            }`}
          >
            <RefreshCw className="h-4 w-4 shrink-0" />
            <span className="flex-1">운영 바로가기</span>
            {syncBadge > 0 && (
              <span className="min-w-[1.25rem] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                {syncBadge > 99 ? '99+' : syncBadge}
              </span>
            )}
          </Link>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {navGroups.map((group) => (
            <div
              key={group.label}
              className={`mb-4 ${
                group.label === '고객 센터'
                  ? 'rounded-xl border border-indigo-500/25 bg-indigo-950/30 p-2'
                  : group.label === '운영'
                    ? 'rounded-xl border border-slate-500/30 bg-slate-900/50 p-2'
                    : ''
              }`}
            >
              <p
                className={`mb-1.5 flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wider ${
                  group.label === '고객 센터'
                    ? 'text-indigo-300'
                    : group.label === '운영'
                      ? 'text-slate-300'
                      : 'text-gray-600'
                }`}
              >
                {group.label === '고객 센터' && <Headphones className="h-3 w-3" />}
                {group.label === '운영' && <RefreshCw className="h-3 w-3 text-amber-400" />}
                {group.label}
              </p>
              {group.items.map(({ href, icon: Icon, label, desc, badgeKey }) => {
                const active = navActive(pathname, href)
                const count = badgeFor(badgeKey)
                const isCustomer = group.label === '고객 센터'
                const isOps = group.label === '운영'
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? isCustomer
                          ? 'bg-indigo-600 text-white'
                          : isOps
                            ? 'bg-slate-600 text-white'
                            : 'bg-gray-800 text-white'
                        : isCustomer
                          ? 'text-indigo-100/90 hover:bg-indigo-900/50'
                          : isOps
                            ? 'text-slate-200/90 hover:bg-slate-800/60'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block leading-tight">{label}</span>
                      {desc && isCustomer && (
                        <span className="block text-[10px] opacity-70">{desc}</span>
                      )}
                    </span>
                    {count > 0 && (
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          badgeKey === 'inquiries' || badgeKey === 'sync'
                            ? 'bg-red-500 text-white'
                            : 'bg-amber-500 text-gray-900'
                        }`}
                      >
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">
            ← 서비스로 돌아가기
          </Link>
        </div>
      </aside>

      <div className="ml-60 flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminTopBar />
        <div className="flex-1 overflow-y-auto bg-gray-100">{children}</div>
      </div>
    </div>
  )
}
