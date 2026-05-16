import type { NextRequest } from 'next/server'
import { handleEvaluateStartup } from '@/lib/gov-support/tools/evaluateStartup'
import { createTraceId } from '@/lib/errors/apiError'
import { getSessionUserId, guardMonthlyUsage, recordUsageIfUser } from '@/lib/billing/usageGate'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function POST(request: NextRequest) {
  const traceId = createTraceId()
  try {
    const body = await request.json()

    const userId = await getSessionUserId()
    const blocked = await guardMonthlyUsage(
      traceId,
      'evaluate.startup.usage',
      userId,
      'evaluation',
      'USAGE_EVALUATION_LIMIT',
      (used, limit) => `이번 달 심사·적격 점수 예측 한도를 모두 사용했습니다. (사용 ${used}/${limit}회)`
    )
    if (blocked) return blocked

    const result = await handleEvaluateStartup({
      programType: body.programType ?? '예비창업패키지',
      technologyDescription: body.technologyDescription,
      differentiationFromExisting: body.differentiationFromExisting,
      patentStatus: body.patentStatus ?? '없음',
      customerValidation: body.customerValidation,
      revenueModel: body.revenueModel,
      salesPlan3Year: body.salesPlan3Year,
      budgetPlan: body.budgetPlan,
      executionPlanMonthly: body.executionPlanMonthly,
      requestedAmount: body.requestedAmount,
      tam: body.tam,
      sam: body.sam,
      som: body.som,
      marketDataSource: body.marketDataSource,
      competitorAnalysis: body.competitorAnalysis,
      marketEntryStrategy: body.marketEntryStrategy,
      founderBackground: body.founderBackground,
      domainExperienceYears: body.domainExperienceYears,
      relevantAchievements: body.relevantAchievements,
      teamComposition: body.teamComposition,
      advisors: body.advisors,
      socialValue: body.socialValue,
      policyAlignment: body.policyAlignment,
      jobCreationPlan: body.jobCreationPlan,
      esgElements: body.esgElements,
    })
    await recordUsageIfUser(userId, 'evaluation')
    return Response.json({ ok: true, ...result as object, trace_id: traceId })
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
