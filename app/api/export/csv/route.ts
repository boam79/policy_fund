import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const dynamic = 'force-dynamic'

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v).replace(/"/g, '""')
    return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s
  }
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n')
}

export async function POST(request: NextRequest) {
  try {
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

    const csv = toCsv(rows)
    const filename = `policyfund_${type}_${new Date().toISOString().slice(0, 10)}.csv`

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
