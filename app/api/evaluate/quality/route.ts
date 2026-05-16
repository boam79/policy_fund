import type { NextRequest } from 'next/server'
import { handleAssessQuality } from '@/lib/gov-support/tools/assessQuality'
import { createTraceId } from '@/lib/errors/apiError'
import { getSessionUserId, guardMonthlyUsage, recordUsageIfUser } from '@/lib/billing/usageGate'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function POST(request: NextRequest) {
  const traceId = createTraceId()
  try {
    const body = await request.json()
    if (!body.planText || body.planText.length < 100) {
      return Response.json({ error: '사업계획서 본문이 너무 짧습니다 (최소 100자)' }, { status: 400 })
    }

    const userId = await getSessionUserId()
    const blocked = await guardMonthlyUsage(
      traceId,
      'evaluate.quality.usage',
      userId,
      'evaluation',
      'USAGE_EVALUATION_LIMIT',
      (used, limit) => `이번 달 심사·적격 점수 예측 한도를 모두 사용했습니다. (사용 ${used}/${limit}회)`
    )
    if (blocked) return blocked

    const result = await handleAssessQuality({
      planText: body.planText,
      template: body.template ?? 'psst',
      programType: body.programType ?? '예비창업패키지',
      requestedAmount: body.requestedAmount,
    })
    await recordUsageIfUser(userId, 'evaluation')
    return Response.json({ ok: true, ...result as object, trace_id: traceId })
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
