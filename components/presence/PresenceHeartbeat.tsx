'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PRESENCE_HEARTBEAT_MS } from '@/lib/presence/config'

const SKIP_PREFIXES = ['/login', '/signup', '/reset-password', '/auth']

function shouldSkipPath(pathname: string): boolean {
  return SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export default function PresenceHeartbeat() {
  const pathname = usePathname() ?? ''
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  useEffect(() => {
    if (shouldSkipPath(pathname)) return

    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    const send = async () => {
      if (cancelled || shouldSkipPath(pathRef.current)) return
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      try {
        await fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: pathRef.current }),
          keepalive: true,
        })
      } catch {
        /* ignore */
      }
    }

    const start = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session || cancelled) return

      void send()
      intervalId = setInterval(() => void send(), PRESENCE_HEARTBEAT_MS)

      const onVisible = () => {
        if (document.visibilityState === 'visible') void send()
      }
      document.addEventListener('visibilitychange', onVisible)

      return () => document.removeEventListener('visibilitychange', onVisible)
    }

    let removeVisible: (() => void) | undefined
    void start().then((cleanup) => {
      removeVisible = cleanup
    })

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
      removeVisible?.()
    }
  }, [pathname])

  return null
}
