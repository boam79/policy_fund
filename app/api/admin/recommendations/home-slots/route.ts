import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'

const admin = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export async function GET() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const { data } = await admin()
    .from('home_recommendation_slots')
    .select('*, program:support_programs(title,organization,application_end_date)')
    .order('priority', { ascending: true })
  return NextResponse.json(data ?? [])
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await admin()
    .from('home_recommendation_slots')
    .update({ ...updates, updated_at: new Date().toISOString() })
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

  const body = await request.json().catch(() => ({}))
  const program_id = typeof body.program_id === 'string' ? body.program_id : ''
  const display_title = typeof body.display_title === 'string' ? body.display_title.trim() : ''
  if (!program_id || !display_title) {
    return NextResponse.json({ error: 'program_id와 display_title이 필요합니다.' }, { status: 400 })
  }

  const slot_type = typeof body.slot_type === 'string' ? body.slot_type : 'manual'
  const priority =
    typeof body.priority === 'number' && Number.isFinite(body.priority) ? Math.floor(body.priority) : undefined
  const is_active = typeof body.is_active === 'boolean' ? body.is_active : true

  const now = new Date().toISOString()
  const { data: existing } = await admin()
    .from('home_recommendation_slots')
    .select('priority')
    .order('priority', { ascending: false })
    .limit(1)
    .maybeSingle()

  const resolvedPriority =
    priority ?? ((existing?.priority != null ? Number(existing.priority) : 0) + 1)

  const { data, error } = await admin()
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

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 쿼리가 필요합니다.' }, { status: 400 })

  const { error } = await admin().from('home_recommendation_slots').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
