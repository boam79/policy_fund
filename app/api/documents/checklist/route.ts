import type { NextRequest } from 'next/server'
import { handleGenerateDocumentChecklist } from '@/lib/gov-support/tools/documentChecklist'
import { apiError, createTraceId, logApiError } from '@/lib/errors/apiError'
import { getSessionUserId, guardMonthlyUsage, recordUsageIfUser } from '@/lib/billing/usageGate'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const traceId = createTraceId()
  try {
    const body = await request.json()
    if (!body.announcementTitle && !body.announcementText) {
      return apiError({
        status: 400,
        errorCode: 'DOC_CHECKLIST_INPUT_REQUIRED',
        message: '공고명 또는 공고 내용이 필요합니다.',
        step: 'documents.checklist.validate',
        traceId,
      })
    }

    const userId = await getSessionUserId()
    const blocked = await guardMonthlyUsage(
      traceId,
      'documents.checklist.usage',
      userId,
      'document_generate',
      'USAGE_DOCUMENT_LIMIT',
      (used, limit) => `이번 달 문서 AI 생성 한도를 모두 사용했습니다. (사용 ${used}/${limit}건)`
    )
    if (blocked) return blocked

    const result = await handleGenerateDocumentChecklist({
      announcementTitle: body.announcementTitle ?? '',
      announcementText: body.announcementText ?? '',
      deadline: body.deadline,
      businessType: body.businessType ?? '법인',
    })
    await recordUsageIfUser(userId, 'document_generate')
    return Response.json({ ok: true, ...result as object, trace_id: traceId })
  } catch (e: unknown) {
    logApiError('/api/documents/checklist', traceId, e)
    return apiError({
      status: 500,
      errorCode: 'DOC_CHECKLIST_BUILD_FAILED',
      message: e instanceof Error ? e.message : '오류',
      step: 'documents.checklist.execute',
      traceId,
    })
  }
}
