import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkUsageLimit, recordUsage, type UsageEventType } from '@/lib/billing/usage'
import { apiError } from '@/lib/errors/apiError'

export async function getSessionUserId(): Promise<string | null> {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  return user?.id ?? null
}

/** 로그인 사용자에 대해 월 한도 검사. 미로그인이면 통과(스크립트·레거시 호환). */
export async function guardMonthlyUsage(
  traceId: string,
  step: string,
  userId: string | null,
  eventType: UsageEventType,
  errorCode: string,
  message: (used: number, limit: number) => string
): Promise<Response | null> {
  if (!userId) return null
  try {
    const gate = await checkUsageLimit(userId, eventType)
    if (!gate.allowed) {
      return apiError({
        status: 403,
        errorCode,
        message: message(gate.used, gate.limit ?? 0),
        step,
        traceId,
      })
    }
  } catch (e) {
    console.error('[usageGate]', step, e)
    return apiError({
      status: 503,
      errorCode: 'USAGE_CHECK_FAILED',
      message: '이용량 확인에 실패했습니다. 잠시 후 다시 시도해주세요.',
      step: `${step}_gate`,
      traceId,
    })
  }
  return null
}

export async function recordUsageIfUser(userId: string | null, eventType: UsageEventType): Promise<void> {
  if (userId) await recordUsage(userId, eventType)
}
