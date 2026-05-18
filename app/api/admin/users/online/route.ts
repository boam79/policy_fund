import { NextResponse } from 'next/server'
import { isAdminEmail, isAdminUser } from '@/lib/auth/admin'
import { PRESENCE_ONLINE_MINUTES } from '@/lib/presence/config'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const admin = createServiceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 필요' }, { status: 503 })
  }

  const since = new Date(Date.now() - PRESENCE_ONLINE_MINUTES * 60 * 1000).toISOString()

  const { data, error } = await admin
    .from('user_presence')
    .select('user_id,email,last_seen_at,last_path')
    .gte('last_seen_at', since)
    .order('last_seen_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const users = (data ?? [])
    .filter((row) => !isAdminEmail(row.email))
    .map((row) => ({
      id: row.user_id,
      email: row.email,
      last_seen_at: row.last_seen_at,
      last_path: row.last_path,
      seconds_ago: Math.max(
        0,
        Math.floor((Date.now() - new Date(row.last_seen_at).getTime()) / 1000)
      ),
    }))

  return NextResponse.json({
    ok: true,
    count: users.length,
    onlineWithinMinutes: PRESENCE_ONLINE_MINUTES,
    asOf: new Date().toISOString(),
    users,
  })
}
