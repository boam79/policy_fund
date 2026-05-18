import type { NextRequest } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth/admin'
import { isCronBearerAuthorized } from '@/lib/security/cronAuth'

export async function isAdminSyncAuthorized(request: NextRequest): Promise<boolean> {
  if (isCronBearerAuthorized(request)) return true
  try {
    const supabase = await createServerSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return isAdminEmail(user?.email)
  } catch {
    return false
  }
}
