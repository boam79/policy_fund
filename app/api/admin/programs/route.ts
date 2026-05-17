import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'

export const dynamic = 'force-dynamic'

const SERVICE_ROLE_MSG =
  '관리자 공고 API는 SUPABASE_SERVICE_ROLE_KEY가 서버에 설정되어 있어야 합니다.'

function adminDb(): SupabaseClient<Database> | null {
  return createServiceRoleClient()
}

const SELECT_COLS =
  'id,title,organization,region,status,visibility_status,application_end_date,source,recommendation_score,created_at'

/**
 * GET — 공고 목록 (페이지·검색·상태 필터)
 * 쿼리: page, limit, q|search, status
 */
export async function GET(request: NextRequest) {
  if (!(await isAdminUser())) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const db = adminDb()
  if (!db) {
    return Response.json({ error: SERVICE_ROLE_MSG }, { status: 503 })
  }

  const sp = request.nextUrl.searchParams
  const page = Math.max(1, Number(sp.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 20)))
  const q = (sp.get('q') ?? sp.get('search') ?? '').trim()
  const status = (sp.get('status') ?? 'all').trim()
  const source = (sp.get('source') ?? 'all').trim()
  const visibility = (sp.get('visibility') ?? 'all').trim()
  const quality = (sp.get('quality') ?? 'all').trim()

  let query = db
    .from('support_programs')
    .select(SELECT_COLS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (q) query = query.ilike('title', `%${q}%`)
  if (status && status !== 'all') query = query.eq('status', status)
  if (source && source !== 'all') query = query.eq('source', source)
  if (visibility === 'visible' || visibility === 'hidden') {
    query = query.eq('visibility_status', visibility)
  }
  if (quality === 'region_null') query = query.is('region', null)
  if (quality === 'no_industry_tags') query = query.is('industry_tags', null)

  const { data, count, error } = await query
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    programs: data ?? [],
    total: count ?? 0,
    page,
    limit,
  })
}

/**
 * PATCH — 노출 등 메타 업데이트
 * body: { id: string, visibility_status?: 'visible' | 'hidden' }
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAdminUser())) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const db = adminDb()
  if (!db) {
    return Response.json({ error: SERVICE_ROLE_MSG }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) {
    return Response.json({ error: 'id가 필요합니다.' }, { status: 400 })
  }

  const visibility = body.visibility_status
  if (visibility !== 'visible' && visibility !== 'hidden') {
    return Response.json({ error: 'visibility_status는 visible 또는 hidden 이어야 합니다.' }, { status: 400 })
  }

  const { data, error } = await db
    .from('support_programs')
    .update({ visibility_status: visibility })
    .eq('id', id)
    .select(SELECT_COLS)
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ ok: true, program: data })
}
