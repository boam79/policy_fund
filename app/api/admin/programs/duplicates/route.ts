import type { NextRequest } from 'next/server'
import { isAdminUser } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/programs/duplicates — 동일 제목+출처 중복 그룹 (12-3-6, 읽기 전용)
 * 쿼리: limit (기본 30)
 */
export async function GET(request: NextRequest) {
  if (!(await isAdminUser())) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const db = createServiceRoleClient()
  if (!db) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 필요' }, { status: 503 })
  }

  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 30)))

  const { data, error } = await db
    .from('support_programs')
    .select('id, title, source, external_id, status, created_at')
    .order('title')
    .limit(5000)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const groups = new Map<string, typeof data>()
  for (const row of data ?? []) {
    const key = `${row.source}::${row.title.trim()}`
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }

  const duplicates = [...groups.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({
      key,
      title: rows[0]?.title ?? '',
      source: rows[0]?.source ?? '',
      count: rows.length,
      programs: rows,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  return Response.json({
    ok: true,
    duplicate_group_count: duplicates.length,
    policy_note:
      '검색·홈 노출은 source+external_id 기준 upsert로 중복 저장을 줄입니다. 동일 제목 다건은 출처별 별도 공고일 수 있습니다.',
    groups: duplicates,
  })
}
