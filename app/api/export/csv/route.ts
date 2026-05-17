import type { NextRequest } from 'next/server'
import { isAdminUser } from '@/lib/auth/admin'
import { EXPORT_FILE_PREFIX } from '@/lib/site-config'
import { rowsToCsv } from '@/lib/export/csvString'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminUser())) {
      return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { type = 'programs', filters = {} } = body

    const supabase = createServiceRoleClient()
    if (!supabase) {
      return Response.json(
        { error: 'CSV보내기에는 SUPABASE_SERVICE_ROLE_KEY가 서버에 설정되어 있어야 합니다.' },
        { status: 503 }
      )
    }

    let rows: Record<string, unknown>[] = []

    if (type === 'programs') {
      let q = supabase.from('support_programs')
        .select('id,title,organization,region,industry,support_type,application_start_date,application_end_date,support_amount_max_krw,status,source')
        .order('application_end_date', { ascending: true })
        .limit(500)
      if (filters.status) q = q.eq('status', filters.status)
      const { data } = await q
      rows = (data ?? []) as Record<string, unknown>[]
    }

    const csv = rowsToCsv(rows)
    const filename = `${EXPORT_FILE_PREFIX}_${type}_${new Date().toISOString().slice(0, 10)}.csv`

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
