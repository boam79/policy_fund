import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_ADMIN_EMAIL = 'pjm7908@hanmail.net'

/** 운영 관리자 이메일 (요금제·한도 우회·/admin 접근) */
export function getAdminEmail(): string {
  return (process.env.ADMIN_ONLY_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase().trim()
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().trim() === getAdminEmail()
}

export async function isAdminUser(): Promise<boolean> {
  const server = await createServerClient()
  const {
    data: { user },
  } = await server.auth.getUser()
  return isAdminEmail(user?.email)
}

const bypassCache = new Map<string, { bypass: boolean; expires: number }>()
const BYPASS_CACHE_MS = 5 * 60_000

/**
 * 관리자 계정은 DB 구독 플랜·월/일 사용 한도를 적용하지 않음.
 */
export async function userBypassesPlanLimits(userId: string): Promise<boolean> {
  const hit = bypassCache.get(userId)
  if (hit && hit.expires > Date.now()) return hit.bypass

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return false

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.auth.admin.getUserById(userId)
  const bypass = !error && isAdminEmail(data.user?.email)
  bypassCache.set(userId, { bypass, expires: Date.now() + BYPASS_CACHE_MS })
  return bypass
}
