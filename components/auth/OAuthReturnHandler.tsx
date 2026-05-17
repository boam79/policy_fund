'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { safeInternalNextPath } from '@/lib/auth/safeNextPath'

/**
 * Supabase OAuth가 Site URL(/)로 code를 붙여 돌려보낼 때 클라이언트에서 세션 교환.
 * middleware 교환과 중복될 수 있으나, code는 1회용이라 먼저 성공한 쪽만 유효.
 */
export default function OAuthReturnHandler() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return

    const raw = searchParams.get('code')
    if (!raw) return
    handled.current = true

    const code = raw.replace(/#+$/, '').trim()
    const next = safeInternalNextPath(searchParams.get('next'))

    const cleanQuery = () => {
      const q = new URLSearchParams(searchParams.toString())
      q.delete('code')
      q.delete('error')
      q.delete('error_description')
      q.delete('next')
      const qs = q.toString()
      return qs ? `?${qs}` : ''
    }

    const supabase = createClient()
    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error('[OAuthReturnHandler] exchangeCodeForSession:', error.message)
        router.replace('/login?auth_error=auth_callback_failed')
        router.refresh()
        return
      }
      const dest = next !== '/' ? next : `${pathname}${cleanQuery()}`
      router.replace(dest)
      router.refresh()
    })
  }, [pathname, router, searchParams])

  return null
}
