import type { NextRequest } from 'next/server'
import { handleBuildApplicationTimeline } from '@/lib/gov-support/tools/timeline'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await handleBuildApplicationTimeline({
      announcementTitle: body.announcementTitle ?? '',
      deadline: body.deadline ?? '',
      startDate: body.startDate,
      announcementDate: body.announcementDate,
      estimatedWorkingDays: body.estimatedWorkingDays ?? 14,
    })
    return Response.json({ ok: true, ...result as object })
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
