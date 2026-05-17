import type { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getPlanIdForUser } from '@/lib/billing/usage'
import { planAllowsTabularExport } from '@/lib/billing/plans'
import { rowsToCsv, rowsToXlsxBuffer } from '@/lib/export/table'
import { EXPORT_FILE_PREFIX } from '@/lib/site-config'
import { isBodyTooLarge } from '@/lib/security/requestBody'
import { userBypassesPlanLimits } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

const MAX_ROWS = 500
const MAX_BODY_BYTES = 512_000
const MAX_COLS_PER_ROW = 40
const MAX_CELL_CHARS = 2_000

function sanitizeExportRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.slice(0, MAX_ROWS).map((row) => {
    const out: Record<string, unknown> = {}
    let col = 0
    for (const [k, v] of Object.entries(row)) {
      if (col >= MAX_COLS_PER_ROW) break
      const key = String(k).slice(0, 80)
      if (typeof v === 'string') out[key] = v.slice(0, MAX_CELL_CHARS)
      else if (typeof v === 'number' || typeof v === 'boolean' || v === null) out[key] = v
      else out[key] = String(v).slice(0, MAX_CELL_CHARS)
      col += 1
    }
    return out
  })
}

/**
 * 로그인 사용자 전용: 클라이언트가 넘긴 표 형태 데이터를 CSV/XLSX로 반환.
 * Starter·Pro만 허용 (요금제 CSV/XLSX 보내기).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    if (isBodyTooLarge(request, MAX_BODY_BYTES)) {
      return Response.json({ error: '요청 본문이 너무 큽니다.' }, { status: 413 })
    }

    const adminBypass = await userBypassesPlanLimits(user.id)
    const planId = await getPlanIdForUser(user.id)
    if (!adminBypass && !planAllowsTabularExport(planId)) {
      return Response.json(
        { error: 'CSV·XLSX 보내기는 Starter 이상 플랜에서 이용할 수 있습니다.' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as {
      format?: 'csv' | 'xlsx'
      rows?: Record<string, unknown>[]
      filenamePrefix?: string
    }
    const format = body.format === 'xlsx' ? 'xlsx' : 'csv'
    const rows = Array.isArray(body.rows)
      ? sanitizeExportRows(body.rows as Record<string, unknown>[])
      : []
    if (!rows.length) {
      return Response.json({ error: '보낼 데이터(rows)가 비어 있습니다.' }, { status: 400 })
    }

    const prefix = (body.filenamePrefix ?? 'export').replace(/[^\w\-가-힣]/g, '_').slice(0, 60)
    const date = new Date().toISOString().slice(0, 10)

    if (format === 'csv') {
      const csv = rowsToCsv(rows)
      const filename = `${EXPORT_FILE_PREFIX}_${prefix}_${date}.csv`
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    const buf = rowsToXlsxBuffer(rows, '데이터')
    const filename = `${EXPORT_FILE_PREFIX}_${prefix}_${date}.xlsx`
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
