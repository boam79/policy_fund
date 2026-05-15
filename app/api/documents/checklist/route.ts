import type { NextRequest } from 'next/server'
import { handleGenerateDocumentChecklist } from '@/lib/gov-support/tools/documentChecklist'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await handleGenerateDocumentChecklist({
      announcementTitle: body.announcementTitle ?? '',
      announcementText: body.announcementText ?? '',
      deadline: body.deadline,
      businessType: body.businessType ?? '법인',
    })
    return Response.json({ ok: true, ...result as object })
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
