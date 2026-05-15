import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import * as XLSX from 'xlsx'
import { isAdminUser } from '@/lib/auth/admin'
import { EXPORT_FILE_PREFIX } from '@/lib/site-config'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminUser())) {
      return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { type = 'programs', filters = {} } = body

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

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

    // 한글 컬럼명 매핑
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

    const wsData = rows.length > 0
      ? [
          Object.keys(rows[0]).map(k => HEADERS[k] ?? k),
          ...rows.map(r => Object.keys(r).map(k => r[k] ?? '')),
        ]
      : [Object.values(HEADERS)]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, '지원사업목록')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `${EXPORT_FILE_PREFIX}_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
