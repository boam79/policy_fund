import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export type BusinessProfilePayload = {
  region?: string | null
  city?: string | null
  industry?: string | null
  business_age_years?: number | null
  employee_count?: number | null
  company_name?: string | null
  support_purpose?: string | null
  tax_arrears?: boolean
  business_type?: string | null
  startup_stage?: string | null
}

export async function upsertBusinessProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  profile: BusinessProfilePayload,
  existingId?: string | null
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const payload = {
    user_id: userId,
    company_name: profile.company_name?.trim() || null,
    region: profile.region?.trim() || null,
    city: profile.city?.trim() || null,
    industry: profile.industry?.trim() || null,
    business_age_years: profile.business_age_years ?? null,
    employee_count: profile.employee_count ?? null,
    support_purpose: profile.support_purpose?.trim() || null,
    tax_arrears: profile.tax_arrears ?? false,
    business_type: profile.business_type?.trim() || null,
    startup_stage: profile.startup_stage?.trim() || null,
  }

  if (existingId) {
    const { error } = await supabase.from('business_profiles').update(payload).eq('id', existingId)
    if (error) return { ok: false, message: error.message }
    return { ok: true, id: existingId }
  }

  const { data, error } = await supabase
    .from('business_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? '저장 실패' }
  return { ok: true, id: data.id as string }
}
