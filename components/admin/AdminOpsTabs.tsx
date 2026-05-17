'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutDashboard, FileText, RefreshCw, Star, Settings } from 'lucide-react'

const TABS = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: '대시보드' },
  { href: '/admin/programs', icon: FileText, label: '공고' },
  { href: '/admin/sync', icon: RefreshCw, label: '동기화' },
  { href: '/admin/recommendations', icon: Star, label: '홈 배너' },
  { href: '/admin/settings', icon: Settings, label: '설정' },
] as const

function tabActive(pathname: string, href: string) {
  if (href === '/admin/programs') {
    return pathname === href || pathname.startsWith(`${href}/`)
  }
  return pathname === href
}

/** 운영 메뉴 공통 상단 탭 */
export function AdminOpsTabs() {
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()
  const view = searchParams.get('view')

  return (
    <nav className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {TABS.map(({ href, icon: Icon, label }) => {
        const active = tabActive(pathname, href)
        const hrefWithView =
          href === '/admin/programs' && view === 'duplicates' && active
            ? `${href}?view=duplicates`
            : href
        return (
          <Link
            key={href}
            href={hrefWithView}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
