import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClientIp, takeRateLimit } from '@/lib/security/rateLimit'
import {
  validateBusinesses,
  statusBusinesses,
  isValidateMatch,
  businessStatusLabel,
  type NtsValidateRow,
} from '@/lib/gov-support/clients/ntsBusinessman'
import {
  getCachedValidate,
  setCachedValidate,
  getCachedStatus,
  setCachedStatus,
} from '@/lib/profile/businessVerifyCache'
import {
  normalizeBusinessNumber,
  normalizeStartDate,
} from '@/lib/profile/normalizeBusinessNumber'

export const dynamic = 'force-dynamic'

type Body = {
  mode?: 'validate' | 'status'
  b_no?: string
  start_dt?: string
  p_nm?: string
  b_nm?: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 })
  }

  const rl = takeRateLimit(request, 'verify-business', { windowMs: 60_000, max: 10 })
  if (!rl.ok) {
    return Response.json(
      {
        ok: false,
        message: `요청이 많습니다. ${rl.retryAfterSec}초 후 다시 시도해 주세요.`,
      },
      { status: 429 }
    )
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return Response.json({ ok: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const bNo = normalizeBusinessNumber(String(body.b_no ?? ''))
  if (!bNo) {
    return Response.json(
      { ok: false, message: '사업자등록번호 10자리를 입력해 주세요.' },
      { status: 400 }
    )
  }

  const mode = body.mode === 'status' ? 'status' : 'validate'

  try {
    if (mode === 'status') {
      const cached = getCachedStatus([bNo])
      const rows = cached ?? (await statusBusinesses([bNo]))
      if (!cached) setCachedStatus([bNo], rows)
      const row = rows.find((r) => String(r.b_no ?? '').replace(/\D/g, '') === bNo)
      return Response.json({
        ok: true,
        mode: 'status',
        b_no: bNo,
        matched: Boolean(row),
        status_label: businessStatusLabel(row?.b_stt_cd),
        status_code: row?.b_stt_cd ?? null,
        tax_type: row?.tax_type ?? null,
        cached: Boolean(cached),
        client_ip_logged: getClientIp(request),
      })
    }

    const startDt = normalizeStartDate(String(body.start_dt ?? ''))
    const pNm = String(body.p_nm ?? '').trim()
    if (!startDt || !pNm) {
      return Response.json(
        { ok: false, message: '개업일(YYYYMMDD)과 대표자 성명을 입력해 주세요.' },
        { status: 400 }
      )
    }

    const input = {
      b_no: bNo,
      start_dt: startDt,
      p_nm: pNm,
      ...(body.b_nm?.trim() ? { b_nm: body.b_nm.trim() } : {}),
    }

    const cached = getCachedValidate(input)
    let rows: NtsValidateRow[]
    if (cached) {
      rows = cached
    } else {
      rows = await validateBusinesses([input])
      setCachedValidate(input, rows)
    }

    const row = rows.find((r) => String(r.b_no ?? '').replace(/\D/g, '') === bNo)
    const matched = isValidateMatch(row)
    const statusCd =
      row?.status && typeof row.status === 'object'
        ? String((row.status as Record<string, unknown>).b_stt_cd ?? '')
        : undefined

    return Response.json({
      ok: true,
      mode: 'validate',
      b_no: bNo,
      matched,
      valid: row?.valid ?? null,
      valid_msg: row?.valid_msg ?? (matched ? '일치' : '불일치'),
      status_label: businessStatusLabel(statusCd),
      status_code: statusCd ?? null,
      company_name_hint: body.b_nm?.trim() || null,
      cached: Boolean(cached),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : '진위확인에 실패했습니다.'
    console.error('[verify-business]', message)
    return Response.json({ ok: false, message }, { status: 502 })
  }
}
