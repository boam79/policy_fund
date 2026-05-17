import { NextResponse } from 'next/server'
import {
  planAllowsStrictSearch,
  planAllowsTabularExport,
  getPlan,
  type PlanId,
} from '@/lib/billing/plans'
import { checkDailyUsageLimit, getPlanIdForUser } from '@/lib/billing/usage'
import { getSessionUserId } from '@/lib/billing/usageGate'

export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/entitlements — 클라이언트 UI 게이트(엄격 검색·export·일일 한도)
 */
export async function GET() {
  const userId = await getSessionUserId()
  const planId: PlanId = userId ? await getPlanIdForUser(userId) : 'free'
  const plan = getPlan(planId)

  const parseDaily = userId
    ? await checkDailyUsageLimit(userId, 'parse_query')
    : { allowed: true, used: 0, limit: plan.limits.parse_queries_per_day, plan: planId }
  const searchDaily = userId
    ? await checkDailyUsageLimit(userId, 'search_request')
    : { allowed: true, used: 0, limit: plan.limits.search_requests_per_day, plan: planId }

  return NextResponse.json({
    ok: true,
    logged_in: Boolean(userId),
    plan: planId,
    allows_strict_search: planAllowsStrictSearch(planId),
    allows_tabular_export: planAllowsTabularExport(planId),
    parse_daily: {
      used: parseDaily.used,
      limit: parseDaily.limit,
      remaining:
        parseDaily.limit != null ? Math.max(0, parseDaily.limit - parseDaily.used) : null,
    },
    search_daily: {
      used: searchDaily.used,
      limit: searchDaily.limit,
      remaining:
        searchDaily.limit != null ? Math.max(0, searchDaily.limit - searchDaily.used) : null,
    },
  })
}
