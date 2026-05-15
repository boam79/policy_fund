import type { NextRequest } from 'next/server'
import { handleDraftBusinessPlan } from '@/lib/gov-support/tools/draftTools'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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
      } catch { /* 저장 실패 무시 */ }
    }

    return Response.json({ ok: true, ...result as object })
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : '오류' }, { status: 500 })
  }
}
