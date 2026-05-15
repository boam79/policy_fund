import type { NextRequest } from 'next/server'
import { handleBuildApplicationTimeline } from '@/lib/gov-support/tools/timeline'
import { apiError, createTraceId, logApiError } from '@/lib/errors/apiError'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const traceId = createTraceId()
  try {
    const body = await request.json()
    if (!body.announcementTitle || !body.deadline) {
      return apiError({
        status: 400,
        errorCode: 'DOC_TIMELINE_INPUT_REQUIRED',
        message: '공고명과 마감일은 필수입니다.',
        step: 'documents.timeline.validate',
        traceId,
      })
    }
    const result = await handleBuildApplicationTimeline({
      announcementTitle: body.announcementTitle ?? '',
      deadline: body.deadline ?? '',
      startDate: body.startDate,
      announcementDate: body.announcementDate,
      estimatedWorkingDays: body.estimatedWorkingDays ?? 14,
    })
    return Response.json({ ok: true, ...result as object, trace_id: traceId })
  } catch (e: unknown) {
    logApiError('/api/documents/timeline', traceId, e)
    return apiError({
      status: 500,
      errorCode: 'DOC_TIMELINE_BUILD_FAILED',
      message: e instanceof Error ? e.message : '오류',
      step: 'documents.timeline.execute',
      traceId,
    })
  }
}
