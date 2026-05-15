import { createClient } from '@/lib/supabase/client'
import type { SavedBusinessProfileDefaults } from '@/lib/profile/business-profile-defaults'

const SELECT =
  'region,city,industry,business_age_years,employee_count,annual_revenue_krw,desired_amount_krw,support_purpose,business_type,startup_stage,tax_arrears,company_name' as const

/** 로그인 사용자의 `business_profiles` 한 건 (없으면 null) */
export async function fetchMyBusinessProfileDefaults(): Promise<SavedBusinessProfileDefaults | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('business_profiles')
    .select(SELECT)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null
  return data as SavedBusinessProfileDefaults
}
