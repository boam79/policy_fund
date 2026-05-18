'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function AdminTopBar() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const email =
    user?.email ??
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    '관리자'

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">관리자 콘솔</p>

      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
            <User className="h-4 w-4 text-indigo-600" />
          </span>
          <span className="hidden sm:block max-w-[180px] truncate">{email}</span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" aria-hidden onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border bg-white py-1 shadow-lg">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                서비스로 돌아가기
              </Link>
              <hr className="my-1 border-gray-100" />
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
