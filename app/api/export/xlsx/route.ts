import type { NextRequest } from 'next/server'
import { isAdminUser } from '@/lib/auth/admin'
import { rowsToXlsxBuffer } from '@/lib/export/table'
import { EXPORT_FILE_PREFIX } from '@/lib/site-config'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'

export const dynamic = 'force-dynamic'

const HEADERS: Record<string, string> = {
  id: 'ID',
  title: '사업명',
  organization: '주관기관',
  region: '지역',
  industry: '업종',
  support_type: '지원유형',
  application_start_date: '접수시작일',
  application_end_date: '마감일',
  support_amount_max_krw: '최대지원금(원)',
  status: '상태',
  source: '출처',
}

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
        { error: 'XLSX보내기에는 SUPABASE_SERVICE_ROLE_KEY가 서버에 설정되어 있어야 합니다.' },
        { status: 503 }
      )
    }

    let rows: Record<string, unknown>[] = []

    if (type === 'programs') {
      let q = supabase
        .from('support_programs')
        .select(
          'id,title,organization,region,industry,support_type,application_start_date,application_end_date,support_amount_max_krw,status,source'
        )
        .order('application_end_date', { ascending: true })
        .limit(500)
      if (filters.status) q = q.eq('status', filters.status)
      const { data } = await q
      rows = (data ?? []) as Record<string, unknown>[]
    }

    const koreanRows = rows.map((row) => {
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(row)) {
        out[HEADERS[key] ?? key] = value ?? ''
      }
      return out
    })

    const buf = await rowsToXlsxBuffer(koreanRows, '지원사업목록')
    const filename = `${EXPORT_FILE_PREFIX}_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`

    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
