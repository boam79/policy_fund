import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const server = await createServerClient()
  const {
    data: { user },
  } = await server.auth.getUser()

  if (!user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 503 })
  }

  let lastPath: string | null = null
  try {
    const body = (await request.json()) as { path?: string }
    if (typeof body.path === 'string' && body.path.length <= 500) {
      lastPath = body.path
    }
  } catch {
    /* empty body ok */
  }

  const now = new Date().toISOString()
  const { error } = await admin.from('user_presence').upsert(
    {
      user_id: user.id,
      email: user.email ?? '',
      last_seen_at: now,
      last_path: lastPath,
      updated_at: now,
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
