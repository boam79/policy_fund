import { isAdminUser } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'
import { stripHtmlToText } from '@/lib/utils/stripHtml'

export const dynamic = 'force-dynamic'

const HTML_SNIPPET = /<[a-z][\s\S]*>/i

/**
 * GET /api/admin/programs/quality — 데이터 품질 요약 (12-3-5)
 */
export async function GET() {
  if (!(await isAdminUser())) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const db = createServiceRoleClient()
  if (!db) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 필요' }, { status: 503 })
  }

  const { count: total, error: totalErr } = await db
    .from('support_programs')
    .select('*', { count: 'exact', head: true })

  if (totalErr) {
    return Response.json({ error: totalErr.message }, { status: 500 })
  }

  const totalN = total ?? 0

  const { count: nullRegion } = await db
    .from('support_programs')
    .select('*', { count: 'exact', head: true })
    .is('region', null)

  const { count: emptyTags } = await db
    .from('support_programs')
    .select('*', { count: 'exact', head: true })
    .is('industry_tags', null)

  const sampleSize = Math.min(200, totalN || 200)
  const { data: sample } = await db
    .from('support_programs')
    .select('eligibility_text, summary_text')
    .order('updated_at', { ascending: false })
    .limit(sampleSize)

  let htmlResidual = 0
  for (const row of sample ?? []) {
    const blob = [row.eligibility_text, row.summary_text].filter(Boolean).join(' ')
    if (HTML_SNIPPET.test(blob)) htmlResidual++
  }

  const pct = (n: number) => (totalN > 0 ? Math.round((n / totalN) * 1000) / 10 : 0)

  return Response.json({
    ok: true,
    total: totalN,
    region_null_count: nullRegion ?? 0,
    region_null_pct: pct(nullRegion ?? 0),
    industry_tags_empty_count: emptyTags ?? 0,
    industry_tags_empty_pct: pct(emptyTags ?? 0),
    html_residual_sample_size: sample?.length ?? 0,
    html_residual_count: htmlResidual,
    html_residual_pct:
      sample && sample.length > 0 ? Math.round((htmlResidual / sample.length) * 1000) / 10 : 0,
    html_residual_note: '최근 공고 샘플에서 eligibility/summary HTML 잔여 비율(추정)',
    strip_preview_chars: 120,
    sample_strip_example:
      sample?.[0]?.eligibility_text != null
        ? stripHtmlToText(String(sample[0].eligibility_text)).slice(0, 120)
        : null,
  })
}
