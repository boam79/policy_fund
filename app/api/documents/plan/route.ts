import type { NextRequest } from 'next/server'
import { handleDraftBusinessPlan } from '@/lib/gov-support/tools/draftTools'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { apiError, createTraceId, logApiError } from '@/lib/errors/apiError'
import { getSessionUserId, guardMonthlyUsage, recordUsageIfUser } from '@/lib/billing/usageGate'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const traceId = createTraceId()
  try {
    const body = await request.json()
    if (!body.announcementTitle || !body.announcementText) {
      return apiError({
        status: 400,
        errorCode: 'DOC_PLAN_INPUT_REQUIRED',
        message: '공고명과 공고 내용은 필수입니다.',
        step: 'documents.plan.validate',
        traceId,
      })
    }

    const userId = await getSessionUserId()
    const blocked = await guardMonthlyUsage(
      traceId,
      'documents.plan.usage',
      userId,
      'document_generate',
      'USAGE_DOCUMENT_LIMIT',
      (used, limit) => `이번 달 문서 AI 생성 한도를 모두 사용했습니다. (사용 ${used}/${limit}건)`
    )
    if (blocked) return blocked

    const result = await handleDraftBusinessPlan({
      announcementTitle: body.announcementTitle ?? '',
      announcementText: body.announcementText ?? '',
      businessNumber: body.businessNumber,
      companyProfile: body.companyProfile,
      requestedAmount: body.requestedAmount,
      projectPeriodMonths: body.projectPeriodMonths,
      template: body.template ?? 'gov',
      language: '한국어',
    })

    // generated_documents 저장
    if (body.program_id) {
      try {
        const supabase = createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
        await supabase.from('generated_documents').insert({
          doc_type: 'business_plan',
          template: body.template ?? 'gov',
          program_id: body.program_id,
          title: body.announcementTitle ?? '사업계획서',
          content_md: JSON.stringify(result),
          status: 'draft',
        })
      } catch (saveErr) {
        logApiError('/api/documents/plan', traceId, saveErr, {
          step: 'documents.plan.save_generated',
          program_id: body.program_id,
        })
      }
    }

    await recordUsageIfUser(userId, 'document_generate')
    return Response.json({ ok: true, ...result as object, trace_id: traceId })
  } catch (e: unknown) {
    logApiError('/api/documents/plan', traceId, e)
    return apiError({
      status: 500,
      errorCode: 'DOC_PLAN_DRAFT_FAILED',
      message: e instanceof Error ? e.message : '오류',
      step: 'documents.plan.execute',
      traceId,
    })
  }
}
