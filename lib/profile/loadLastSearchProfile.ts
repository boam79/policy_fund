export type ProfileDraft = {
  region?: string
  city?: string
  industry?: string
  business_age_years?: number
  employee_count?: number
  tax_arrears?: boolean
  support_purpose?: string
}

export function loadLastSearchProfile(): { draft: ProfileDraft | null; source: 'draft' | 'search_url' | null } {
  if (typeof window === 'undefined') return { draft: null, source: null }

  const draftRaw = localStorage.getItem('pf:last_profile_draft')
  if (draftRaw) {
    try {
      return { draft: JSON.parse(draftRaw) as ProfileDraft, source: 'draft' }
    } catch {
      /* fall through */
    }
  }

  const urlRaw = localStorage.getItem('pf:last_search_url')
  if (!urlRaw?.includes('?')) return { draft: null, source: null }

  try {
    const q = urlRaw.split('?')[1] ?? ''
    const params = new URLSearchParams(q)
    const draft: ProfileDraft = {}
    const region = params.get('region')?.trim()
    const city = params.get('city')?.trim()
    const industry = params.get('industry')?.trim()
    if (region) draft.region = region
    if (city) draft.city = city
    if (industry) draft.industry = industry
    const age = params.get('business_age_years')
    if (age) draft.business_age_years = Number(age)
    const emp = params.get('employee_count')
    if (emp) draft.employee_count = Number(emp)
    const tax = params.get('tax_arrears')
    if (tax === 'yes') draft.tax_arrears = true
    if (tax === 'no') draft.tax_arrears = false
    const purpose = params.get('support_purpose')?.trim()
    if (purpose) draft.support_purpose = purpose
    if (Object.keys(draft).length === 0) return { draft: null, source: null }
    return { draft, source: 'search_url' }
  } catch {
    return { draft: null, source: null }
  }
}

export function profileDraftFromSearchParams(searchParams: URLSearchParams): ProfileDraft {
  const draft: ProfileDraft = {}
  const region = searchParams.get('region')?.trim()
  if (region) draft.region = region
  const city = searchParams.get('city')?.trim()
  if (city) draft.city = city
  const industry = searchParams.get('industry')?.trim()
  if (industry) draft.industry = industry
  const age = searchParams.get('business_age_years')
  if (age) draft.business_age_years = Number(age)
  const emp = searchParams.get('employee_count')
  if (emp) draft.employee_count = Number(emp)
  const tax = searchParams.get('tax_arrears')
  if (tax === 'yes') draft.tax_arrears = true
  if (tax === 'no') draft.tax_arrears = false
  const purpose = searchParams.get('support_purpose')?.trim()
  if (purpose) draft.support_purpose = purpose
  return draft
}
