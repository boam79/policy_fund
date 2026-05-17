'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { User, LogOut, Star, CreditCard } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { SITE_NAME } from '@/lib/site-config'

const navLinks = [
  { href: '/about', label: '서비스 소개' },
  { href: '/search', label: '지원사업 찾기' },
  { href: '/documents/plan', label: '사업계획서' },
  { href: '/guide', label: '이용안내' },
]

export default function Header() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/jiwondungji-logo-mark.png"
            alt={`${SITE_NAME} 로고`}
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-xl object-contain"
            priority
          />
          <span className="text-xl font-bold text-primary">{SITE_NAME}</span>
        </Link>

        <nav className="hidden h-full items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex h-full flex-shrink-0 items-center gap-2">
          {!authReady ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" aria-hidden />
          ) : user ? (
            <div className="relative">
              <button onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors">
                <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <span className="hidden sm:block text-gray-700 max-w-[120px] truncate">{user.email}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border py-1 z-50">
                  <Link href="/mypage" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <User className="h-4 w-4" />마이페이지
                  </Link>
                  <Link href="/manage" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <Star className="h-4 w-4" />내 신청 관리
                  </Link>
                  <Link href="/mypage/billing" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <CreditCard className="h-4 w-4" />결제 관리
                  </Link>
                  <hr className="my-1" />
                  <button onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full text-left">
                    <LogOut className="h-4 w-4" />로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
                로그인
              </Link>
              <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 모바일 메뉴 오버레이 */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
    </header>
  )
}
