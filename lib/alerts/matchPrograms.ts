import type { Database } from '@/types/database.types'

type ProgramRow = Pick<
  Database['public']['Tables']['support_programs']['Row'],
  'id' | 'title' | 'source' | 'region' | 'industry' | 'industry_tags' | 'status' | 'application_end_date' | 'created_at' | 'synced_at'
>

export type AlertProfileInput = {
  regions: string[]
  industries: string[]
  sources: string[]
  keywords: string[]
  notify_days_before: number
  notify_new_programs: boolean
}

export type AlertMatchReason = 'deadline' | 'new_program'

export type AlertProgramMatch = {
  program_id: string
  title: string
  source: string
  reason: AlertMatchReason
  application_end_date: string | null
  days_until_deadline: number | null
}

function norm(s: string | null | undefined): string {
  return (s ?? '').trim()
}

function programIndustries(p: ProgramRow): string[] {
  const tags = p.industry_tags ?? []
  const base = norm(p.industry)
  return [...tags.map((t) => norm(t)).filter(Boolean), ...(base ? [base] : [])]
}

function matchesList(value: string | null, filters: string[]): boolean {
  if (filters.length === 0) return true
  const v = norm(value)
  if (!v) return false
  return filters.some((f) => v.includes(f) || f.includes(v))
}

function matchesKeywords(title: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true
  const t = title.toLowerCase()
  return keywords.some((k) => k.trim() && t.includes(k.trim().toLowerCase()))
}

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null
  const end = new Date(isoDate)
  if (Number.isNaN(end.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

export function matchProgramsForAlert(
  programs: ProgramRow[],
  profile: AlertProfileInput,
  options?: { sinceIso?: string }
): AlertProgramMatch[] {
  const since = options?.sinceIso ? new Date(options.sinceIso) : null
  const out: AlertProgramMatch[] = []
  const seen = new Set<string>()

  for (const p of programs) {
    if (p.status === 'closed' || p.status === 'inactive') continue
    if (profile.sources.length > 0 && !profile.sources.includes(p.source)) continue
    if (!matchesList(p.region, profile.regions)) continue
    if (profile.industries.length > 0) {
      const inds = programIndustries(p)
      if (!profile.industries.some((f) => inds.some((i) => i.includes(f) || f.includes(i)))) continue
    }
    if (!matchesKeywords(p.title, profile.keywords)) continue

    const dLeft = daysUntil(p.application_end_date)
    const deadlineHit =
      dLeft !== null &&
      dLeft >= 0 &&
      dLeft <= profile.notify_days_before

    const createdAt = p.created_at ? new Date(p.created_at) : null
    const newHit =
      profile.notify_new_programs &&
      since &&
      createdAt &&
      !Number.isNaN(createdAt.getTime()) &&
      createdAt >= since

    if (!deadlineHit && !newHit) continue

    const reason: AlertMatchReason = newHit && !deadlineHit ? 'new_program' : 'deadline'
    const key = `${p.id}:${reason}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      program_id: p.id,
      title: p.title,
      source: p.source,
      reason,
      application_end_date: p.application_end_date,
      days_until_deadline: dLeft,
    })
  }

  return out.slice(0, 50)
}
