import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'
import { isUuid } from '@/lib/validation/uuid'

const SERVICE_ROLE_MSG =
  '문의 관리 API는 SUPABASE_SERVICE_ROLE_KEY가 서버에 설정되어 있어야 합니다.'

function getAdminDb(): SupabaseClient<Database> | null {
  return createServiceRoleClient()
}

export async function GET() {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const db = getAdminDb()
    if (!db) {
      return NextResponse.json({ error: SERVICE_ROLE_MSG }, { status: 503 })
    }

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

    const db = getAdminDb()
    if (!db) {
      return NextResponse.json({ error: SERVICE_ROLE_MSG }, { status: 503 })
    }

    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    const status = typeof body.status === 'string' ? body.status.trim() : ''
    if (!id || !isUuid(id) || !status) {
      return NextResponse.json({ error: '유효한 id와 status가 필요합니다.' }, { status: 400 })
    }
    if (!['received', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 상태값' }, { status: 400 })
    }

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
