import type { NextRequest } from 'next/server'
import { handleAssessQuality } from '@/lib/gov-support/tools/assessQuality'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.planText || body.planText.length < 100) {
      return Response.json({ error: '사업계획서 본문이 너무 짧습니다 (최소 100자)' }, { status: 400 })
    }
    const result = await handleAssessQuality({
      planText: body.planText,
      template: body.template ?? 'psst',
      programType: body.programType ?? '예비창업패키지',
      requestedAmount: body.requestedAmount,
    })
    return Response.json({ ok: true, ...result as object })
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
