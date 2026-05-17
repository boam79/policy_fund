/**
 * GET /api/diagnosis/session?id=
 * POST /api/diagnosis/session — 진단 조건을 짧은 sid로 저장 (URL data= 대체)
 */
import { NextRequest } from 'next/server'
import type { ParseNLResult } from '@/lib/query/parseNaturalLanguage'
import { apiError, createTraceId, logApiError } from '@/lib/errors/apiError'
import { requireServiceRoleClient } from '@/lib/supabase/serviceRole'
import { isBodyTooLarge } from '@/lib/security/requestBody'
import { takeRateLimit } from '@/lib/security/rateLimit'
import { isUuid } from '@/lib/validation/uuid'

export const dynamic = 'force-dynamic'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_POST_BODY = 96_000

export async function GET(request: NextRequest) {
  const traceId = createTraceId()
  const id = request.nextUrl.searchParams.get('id')?.trim()
  if (!id) {
    return apiError({
      status: 400,
      errorCode: 'DIAGNOSIS_SESSION_ID_REQUIRED',
      message: '세션 ID가 필요합니다.',
      step: 'diagnosis.session.get.validate',
      traceId,
    })
  }

  if (!isUuid(id)) {
    return apiError({
      status: 400,
      errorCode: 'DIAGNOSIS_SESSION_INVALID_ID',
      message: '진단 세션 ID 형식이 올바르지 않습니다.',
      step: 'diagnosis.session.get.validate',
      traceId,
    })
  }

  try {
    const supabase = requireServiceRoleClient()
    const { data, error } = await supabase
      .from('diagnosis_sessions')
      .select('id, raw_query, parsed_payload, expires_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      logApiError('/api/diagnosis/session', traceId, error)
      return apiError({
        status: 503,
        errorCode: 'DIAGNOSIS_SESSION_UNAVAILABLE',
        message: '진단 세션을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.',
        step: 'diagnosis.session.get.db',
        traceId,
      })
    }

    if (!data) {
      return apiError({
        status: 404,
        errorCode: 'DIAGNOSIS_SESSION_NOT_FOUND',
        message: '진단 세션을 찾을 수 없거나 만료되었습니다.',
        step: 'diagnosis.session.get.missing',
        traceId,
      })
    }

    if (new Date(data.expires_at).getTime() < Date.now()) {
      return apiError({
        status: 410,
        errorCode: 'DIAGNOSIS_SESSION_EXPIRED',
        message: '진단 세션이 만료되었습니다. 홈에서 다시 검색해주세요.',
        step: 'diagnosis.session.get.expired',
        traceId,
      })
    }

    return Response.json({
      ok: true,
      sid: data.id,
      raw_query: data.raw_query,
      parsed: data.parsed_payload as unknown as ParseNLResult,
      trace_id: traceId,
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'SUPABASE_SERVICE_ROLE_KEY_REQUIRED') {
      return apiError({
        status: 503,
        errorCode: 'DIAGNOSIS_SESSION_UNAVAILABLE',
        message: '진단 세션 서비스를 일시적으로 사용할 수 없습니다.',
        step: 'diagnosis.session.get.config',
        traceId,
      })
    }
    logApiError('/api/diagnosis/session', traceId, e)
    return apiError({
      status: 500,
      errorCode: 'DIAGNOSIS_SESSION_INTERNAL_ERROR',
      message: '진단 세션 조회 중 오류가 발생했습니다.',
      step: 'diagnosis.session.get.execute',
      traceId,
    })
  }
}

export async function POST(request: NextRequest) {
  const traceId = createTraceId()
  try {
    const rate = takeRateLimit(request, 'api:diagnosis:session:post', { windowMs: 60_000, max: 25 })
    if (!rate.ok) {
      return apiError({
        status: 429,
        errorCode: 'DIAGNOSIS_SESSION_RATE_LIMITED',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        step: 'diagnosis.session.post.rate_limit',
        traceId,
      })
    }

    if (isBodyTooLarge(request, MAX_POST_BODY)) {
      return apiError({
        status: 413,
        errorCode: 'DIAGNOSIS_SESSION_BODY_TOO_LARGE',
        message: '요청 본문이 너무 큽니다.',
        step: 'diagnosis.session.post.validate',
        traceId,
      })
    }

    const body = (await request.json()) as { raw_query?: string; parsed?: ParseNLResult }
    if (!body.parsed || typeof body.parsed !== 'object') {
      return apiError({
        status: 400,
        errorCode: 'DIAGNOSIS_SESSION_INVALID_PAYLOAD',
        message: '진단 데이터가 올바르지 않습니다.',
        step: 'diagnosis.session.post.validate',
        traceId,
      })
    }

    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
    const supabase = requireServiceRoleClient()
    const { data, error } = await supabase
      .from('diagnosis_sessions')
      .insert({
        raw_query: body.raw_query ?? body.parsed.raw_query ?? null,
        parsed_payload: JSON.parse(JSON.stringify(body.parsed)),
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (error || !data) {
      logApiError('/api/diagnosis/session', traceId, error ?? 'insert failed')
      return apiError({
        status: 503,
        errorCode: 'DIAGNOSIS_SESSION_CREATE_FAILED',
        message: '진단 세션을 저장할 수 없습니다.',
        step: 'diagnosis.session.post.db',
        traceId,
        meta: { hint: 'Supabase에 diagnosis_sessions 테이블이 있는지 확인하세요.' },
      })
    }

    return Response.json({
      ok: true,
      sid: data.id,
      expires_at: expiresAt,
      trace_id: traceId,
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'SUPABASE_SERVICE_ROLE_KEY_REQUIRED') {
      return apiError({
        status: 503,
        errorCode: 'DIAGNOSIS_SESSION_UNAVAILABLE',
        message: '진단 세션 서비스를 일시적으로 사용할 수 없습니다.',
        step: 'diagnosis.session.post.config',
        traceId,
      })
    }
    logApiError('/api/diagnosis/session', traceId, e)
    return apiError({
      status: 500,
      errorCode: 'DIAGNOSIS_SESSION_INTERNAL_ERROR',
      message: '진단 세션 저장 중 오류가 발생했습니다.',
      step: 'diagnosis.session.post.execute',
      traceId,
    })
  }
}
