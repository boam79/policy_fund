import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'
import { isUuid } from '@/lib/validation/uuid'

const SLOT_TYPES = new Set(['featured', 'closing_soon', 'new', 'manual'])

const SERVICE_ROLE_MSG =
  '홈 슬롯 API는 SUPABASE_SERVICE_ROLE_KEY가 서버에 설정되어 있어야 합니다.'

function admin(): SupabaseClient<Database> | null {
  return createServiceRoleClient()
}

export async function GET() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }
  const db = admin()
  if (!db) {
    return NextResponse.json({ error: SERVICE_ROLE_MSG }, { status: 503 })
  }

  const { data } = await db
    .from('home_recommendation_slots')
    .select('*, program:support_programs(title,organization,application_end_date)')
    .order('priority', { ascending: true })
  return NextResponse.json(data ?? [])
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }
  const db = admin()
  if (!db) {
    return NextResponse.json({ error: SERVICE_ROLE_MSG }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  if (!id || !isUuid(id)) return NextResponse.json({ error: '유효한 id가 필요합니다.' }, { status: 400 })

  const patch: {
    updated_at: string
    is_active?: boolean
    priority?: number
    display_title?: string
    slot_type?: string
  } = { updated_at: new Date().toISOString() }
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  if (typeof body.priority === 'number' && Number.isFinite(body.priority)) {
    patch.priority = Math.floor(body.priority)
  }
  if (typeof body.display_title === 'string') {
    const t = body.display_title.trim()
    if (t) patch.display_title = t.slice(0, 200)
  }
  if (typeof body.slot_type === 'string' && SLOT_TYPES.has(body.slot_type)) {
    patch.slot_type = body.slot_type
  }
  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: '변경할 필드가 없습니다.' }, { status: 400 })
  }

  const { data, error } = await db
    .from('home_recommendation_slots')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }
  const db = admin()
  if (!db) {
    return NextResponse.json({ error: SERVICE_ROLE_MSG }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const program_id = typeof body.program_id === 'string' ? body.program_id.trim() : ''
  const display_title = typeof body.display_title === 'string' ? body.display_title.trim() : ''
  if (!program_id || !isUuid(program_id) || !display_title) {
    return NextResponse.json({ error: '유효한 program_id와 display_title이 필요합니다.' }, { status: 400 })
  }

  const slot_type =
    typeof body.slot_type === 'string' && SLOT_TYPES.has(body.slot_type) ? body.slot_type : 'manual'
  const priority =
    typeof body.priority === 'number' && Number.isFinite(body.priority) ? Math.floor(body.priority) : undefined
  const is_active = typeof body.is_active === 'boolean' ? body.is_active : true

  const now = new Date().toISOString()
  const { data: existing } = await db
    .from('home_recommendation_slots')
    .select('priority')
    .order('priority', { ascending: false })
    .limit(1)
    .maybeSingle()

  const resolvedPriority =
    priority ?? ((existing?.priority != null ? Number(existing.priority) : 0) + 1)

  const { data, error } = await db
    .from('home_recommendation_slots')
    .insert({
      program_id,
      slot_type,
      display_title,
      priority: resolvedPriority,
      is_active,
      updated_at: now,
    })
    .select('*, program:support_programs(title)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }
  const db = admin()
  if (!db) {
    return NextResponse.json({ error: SERVICE_ROLE_MSG }, { status: 503 })
  }

  const id = request.nextUrl.searchParams.get('id')?.trim() ?? ''
  if (!id || !isUuid(id)) return NextResponse.json({ error: '유효한 id 쿼리가 필요합니다.' }, { status: 400 })

  const { error } = await db.from('home_recommendation_slots').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
