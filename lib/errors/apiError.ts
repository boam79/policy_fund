import { maskSensitive } from '@/lib/logging/maskSensitive'

type ApiErrorPayload = {
  ok: false
  error_code: string
  message: string
  step: string
  trace_id: string
  meta?: Record<string, unknown>
}

type ApiErrorInput = {
  status: number
  errorCode: string
  message: string
  step: string
  traceId: string
  meta?: Record<string, unknown>
}

export function createTraceId(): string {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const rand = Math.random().toString(36).slice(2, 10)
  return `trc_${ts}_${rand}`
}

export function apiError(input: ApiErrorInput): Response {
  const payload: ApiErrorPayload = {
    ok: false,
    error_code: input.errorCode,
    message: input.message,
    step: input.step,
    trace_id: input.traceId,
    ...(input.meta ? { meta: input.meta } : {}),
  }

  return Response.json(payload, {
    status: input.status,
    headers: {
      'x-trace-id': input.traceId,
    },
  })
}

export function logApiError(
  scope: string,
  traceId: string,
  error: unknown,
  meta?: Record<string, unknown>
) {
  const message = error instanceof Error ? error.message : String(error)
  const safeMeta = meta ? maskSensitive(meta) : undefined
  console.error(`[${scope}]`, {
    trace_id: traceId,
    error: message,
    ...(safeMeta ? { meta: safeMeta } : {}),
  })
}
