import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { NormalizedProgram } from '@/lib/gov-support/core/normalizer'
import { inferIndustryTags } from '@/lib/industry/inferIndustryTags'

export function programToUpsertRow(p: NormalizedProgram) {
  const industry_tags = inferIndustryTags({
    title: p.title,
    industry: p.industry,
    eligibility_text: p.eligibility_text,
    support_type: p.support_type,
  })
  return {
    source: p.source,
    external_id: p.external_id,
    title: p.title,
    organization: p.organization,
    region: p.region,
    industry: p.industry,
    industry_tags: industry_tags.length > 0 ? industry_tags : null,
    support_type: p.support_type,
    support_amount_min_krw: p.support_amount_min_krw,
    support_amount_max_krw: p.support_amount_max_krw,
    application_start_date: p.application_start_date,
    application_end_date: p.application_end_date,
    eligibility_text: p.eligibility_text,
    exclusion_text: p.exclusion_text,
    required_docs: p.required_docs,
    application_url: p.application_url,
    raw_content: JSON.stringify(p.raw_content),
    status: p.status,
    visibility_status: 'visible' as const,
    synced_at: new Date().toISOString(),
  }
}

export async function upsertOpenPrograms(
  supabase: SupabaseClient<Database>,
  programs: NormalizedProgram[],
  errors: string[] = []
): Promise<number> {
  const openItems = programs.filter((p) => p.status !== 'closed' && p.external_id)
  let upsertedCount = 0
  const BATCH = 50

  for (let i = 0; i < openItems.length; i += BATCH) {
    const batch = openItems.slice(i, i + BATCH)
    const rows = batch.map(programToUpsertRow)
    const { error } = await supabase
      .from('support_programs')
      .upsert(rows, { onConflict: 'source,external_id' })

    if (error) {
      errors.push(`upsert 배치 ${i}-${i + BATCH}: ${error.message}`)
    } else {
      upsertedCount += batch.length
    }
  }

  return upsertedCount
}
