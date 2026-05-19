'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Stethoscope, Bookmark, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/', label: '홈', icon: Home, match: (p: string) => p === '/' },
  { href: '/search?browse=1', label: '검색', icon: Search, match: (p: string) => p.startsWith('/search') },
  { href: '/diagnosis', label: '진단', icon: Stethoscope, match: (p: string) => p.startsWith('/diagnosis') },
  { href: '/manage', label: '찜', icon: Bookmark, match: (p: string) => p === '/manage' },
  { href: '/mypage', label: '마이', icon: User, match: (p: string) => p.startsWith('/mypage') },
] as const

export default function MobileBottomNav() {
  const pathname = usePathname() ?? ''
  if (pathname.startsWith('/admin')) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur md:hidden"
      aria-label="주요 메뉴"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium transition-colors',
                  active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
