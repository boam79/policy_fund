import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'

export async function GET() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // auth.users 는 service role로만 접근 가능
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 100 })
  if (error) return NextResponse.json({ users: [], total: 0 })

  // 구독 플랜 조회
  const { data: subs } = await admin
    .from('subscriptions')
    .select('user_id,plan_code')

  const subMap = Object.fromEntries((subs ?? []).map(s => [s.user_id, s.plan_code]))

  const result = users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    plan: subMap[u.id] ?? 'free',
  }))

  return NextResponse.json({ users: result, total: users.length })
}
