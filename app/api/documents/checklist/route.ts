import type { NextRequest } from 'next/server'
import { handleGenerateDocumentChecklist } from '@/lib/gov-support/tools/documentChecklist'
import { apiError, createTraceId, logApiError } from '@/lib/errors/apiError'

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
    const result = await handleGenerateDocumentChecklist({
      announcementTitle: body.announcementTitle ?? '',
      announcementText: body.announcementText ?? '',
      deadline: body.deadline,
      businessType: body.businessType ?? '법인',
    })
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
