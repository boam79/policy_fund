import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

const ADMIN_ONLY_EMAIL = 'pjm7908@hanmail.net'

async function isAdminUser() {
  const server = await createServerClient()
  const {
    data: { user },
  } = await server.auth.getUser()
  return user?.email?.toLowerCase().trim() === ADMIN_ONLY_EMAIL
}

function getAdminDb() {
  return createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getAdminDb()
    const { data, error } = await db
      .from('customer_inquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: '문의 데이터를 불러오지 못했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ inquiries: data ?? [] })
  } catch (err) {
    console.error('[api/admin/inquiries][GET]', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { id, status } = await request.json()
    if (!id || !status) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }
    if (!['received', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 상태값' }, { status: 400 })
    }

    const db = getAdminDb()
    const { error } = await db.from('customer_inquiries').update({ status }).eq('id', id)
    if (error) {
      return NextResponse.json({ error: '문의 상태를 변경하지 못했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/inquiries][PATCH]', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
