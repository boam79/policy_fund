import { createClient as createServerClient } from '@/lib/supabase/server'

const DEFAULT_ADMIN_EMAIL = 'pjm7908@hanmail.net'

export async function isAdminUser(): Promise<boolean> {
  const server = await createServerClient()
  const {
    data: { user },
  } = await server.auth.getUser()

  const adminEmail = (process.env.ADMIN_ONLY_EMAIL ?? DEFAULT_ADMIN_EMAIL)
    .toLowerCase()
    .trim()
  const email = user?.email?.toLowerCase().trim()
  return email === adminEmail
}
