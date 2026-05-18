import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { normalizePlanId, type PlanId } from '@/lib/billing/plans'

export type UserUsage = {
  eligibility_check: number
  document_generate: number
  evaluation: number
}

export type AdminUserRow = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  plan: PlanId
  subscription_status: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  usage: UserUsage
}

export type SubInfo = {
  plan_code: PlanId
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean | null
}

export type ListFilters = {
  q?: string
  plan?: string
  status?: string
  inactiveDays?: number
  minDocuments?: number
  domain?: string
  segment?: string
  sort?: string
}

const MAX_SCAN_PAGES = 30
const AUTH_PAGE_SIZE = 100
const MAX_LIST_RESULTS = 500

export function createAdminAuthClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function startOfMonthOffset(monthsAgo = 0): string {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function loadSubByUser(
  admin: SupabaseClient<Database>
): Promise<Record<string, SubInfo>> {
  const { data: subs } = await admin
    .from('subscriptions')
    .select('user_id,plan_code,plan,status,current_period_end,cancel_at_period_end,updated_at')
    .order('updated_at', { ascending: false })

  const subByUser: Record<string, SubInfo> = {}
  for (const s of subs ?? []) {
    const uid = s.user_id
    if (!uid || subByUser[uid]) continue
    subByUser[uid] = {
      plan_code: normalizePlanId(String(s.plan_code ?? s.plan ?? 'free')) as PlanId,
      status: s.status,
      current_period_end: s.current_period_end,
      cancel_at_period_end: s.cancel_at_period_end,
    }
  }
  return subByUser
}

export async function loadUsageByUser(
  admin: SupabaseClient<Database>,
  userIds: string[],
  sinceIso: string
): Promise<Record<string, UserUsage>> {
  const usageByUser: Record<string, UserUsage> = {}
  if (!userIds.length) return usageByUser

  for (const uid of userIds) {
    usageByUser[uid] = { eligibility_check: 0, document_generate: 0, evaluation: 0 }
  }

  const { data: events } = await admin
    .from('usage_events')
    .select('user_id,event_type')
    .gte('created_at', sinceIso)
    .in('user_id', userIds)

  for (const ev of events ?? []) {
    const uid = ev.user_id
    if (!uid || !usageByUser[uid]) continue
    if (ev.event_type === 'eligibility_check') usageByUser[uid].eligibility_check += 1
    else if (ev.event_type === 'document_generate') usageByUser[uid].document_generate += 1
    else if (ev.event_type === 'evaluation') usageByUser[uid].evaluation += 1
  }
  return usageByUser
}

export function mapAuthUser(
  u: { id: string; email?: string | null; created_at: string; last_sign_in_at?: string | null },
  subByUser: Record<string, SubInfo>,
  usage: UserUsage
): AdminUserRow {
  const sub = u.id ? subByUser[u.id] : undefined
  return {
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    plan: sub?.plan_code ?? 'free',
    subscription_status: sub?.status ?? null,
    current_period_end: sub?.current_period_end ?? null,
    cancel_at_period_end: sub?.cancel_at_period_end ?? null,
    usage,
  }
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

export function needsFullScan(filters: ListFilters): boolean {
  return Boolean(
    filters.q?.trim() ||
      (filters.plan && filters.plan !== 'all') ||
      (filters.status && filters.status !== 'all') ||
      filters.inactiveDays ||
      filters.minDocuments ||
      filters.domain?.trim() ||
      filters.segment
  )
}

export function matchesFilters(row: AdminUserRow, filters: ListFilters): boolean {
  const q = (filters.q ?? '').trim().toLowerCase()
  if (q && !row.email.toLowerCase().includes(q)) return false

  const plan = filters.plan ?? 'all'
  if (plan !== 'all' && row.plan !== plan) return false

  const status = filters.status ?? 'all'
  if (status === 'none') {
    if (row.subscription_status) return false
  } else if (status !== 'all' && row.subscription_status !== status) {
    return false
  }

  const domain = (filters.domain ?? '').trim().toLowerCase()
  if (domain && !row.email.toLowerCase().endsWith(`@${domain}`) && !row.email.toLowerCase().includes(domain)) {
    return false
  }

  const inactiveDays = filters.inactiveDays ?? 0
  if (inactiveDays > 0) {
    const last = row.last_sign_in_at
    const inactive =
      !last || daysSince(last) === null || (daysSince(last) !== null && daysSince(last)! >= inactiveDays)
    if (!inactive) return false
  }

  const minDocs = filters.minDocuments ?? 0
  if (minDocs > 0 && row.usage.document_generate < minDocs) return false

  const segment = filters.segment ?? ''
  const joinedDays = daysSince(row.created_at) ?? 0
  if (segment === 'dormant') {
    const last = row.last_sign_in_at
    if (!last || (daysSince(last) ?? 0) < 30) return false
  } else if (segment === 'high_usage') {
    if (row.usage.document_generate < 3 && row.usage.eligibility_check < 10) return false
  } else if (segment === 'onboarding_dropout') {
    if (joinedDays > 7 || row.usage.document_generate > 0) return false
  }

  return true
}

export function sortUsers(rows: AdminUserRow[], sort: string): AdminUserRow[] {
  const copy = [...rows]
  const cmpDate = (a: string | null, b: string | null, asc: boolean) => {
    const ta = a ? new Date(a).getTime() : 0
    const tb = b ? new Date(b).getTime() : 0
    return asc ? ta - tb : tb - ta
  }
  switch (sort) {
    case 'created_asc':
      return copy.sort((a, b) => cmpDate(a.created_at, b.created_at, true))
    case 'last_sign_in_asc':
      return copy.sort((a, b) => cmpDate(a.last_sign_in_at, b.last_sign_in_at, true))
    case 'last_sign_in_desc':
      return copy.sort((a, b) => cmpDate(a.last_sign_in_at, b.last_sign_in_at, false))
    case 'docs_desc':
      return copy.sort((a, b) => b.usage.document_generate - a.usage.document_generate)
    case 'created_desc':
    default:
      return copy.sort((a, b) => cmpDate(a.created_at, b.created_at, false))
  }
}

export async function scanAuthUsers(
  admin: SupabaseClient<Database>,
  subByUser: Record<string, SubInfo>,
  sinceIso: string,
  filters: ListFilters
): Promise<{ rows: AdminUserRow[]; scannedAuthPages: number }> {
  const rows: AdminUserRow[] = []
  let scannedAuthPages = 0

  for (let p = 1; p <= MAX_SCAN_PAGES && rows.length < MAX_LIST_RESULTS; p += 1) {
    scannedAuthPages = p
    const { data, error } = await admin.auth.admin.listUsers({ page: p, perPage: AUTH_PAGE_SIZE })
    if (error || !data?.users?.length) break

    const batch = data.users
    const ids = batch.map((u) => u.id)
    const usageByUser = await loadUsageByUser(admin, ids, sinceIso)

    for (const u of batch) {
      const usage = usageByUser[u.id] ?? {
        eligibility_check: 0,
        document_generate: 0,
        evaluation: 0,
      }
      const row = mapAuthUser(u, subByUser, usage)
      if (matchesFilters(row, filters)) rows.push(row)
      if (rows.length >= MAX_LIST_RESULTS) break
    }
    if (data.users.length < AUTH_PAGE_SIZE) break
  }

  return { rows: sortUsers(rows, filters.sort ?? 'created_desc'), scannedAuthPages }
}

export type UserSummary = {
  totalScanned: number
  scannedAuthPages: number
  truncated: boolean
  newUsers7d: number
  inactive30d: number
  docUsersThisMonth: number
  pastDue: number
  byPlan: { free: number; starter: number; pro: number }
  cachedAt: string
}

let summaryCache: { at: number; data: UserSummary } | null = null
const SUMMARY_TTL_MS = 5 * 60 * 1000

export async function computeUserSummary(
  admin: SupabaseClient<Database>
): Promise<UserSummary> {
  if (summaryCache && Date.now() - summaryCache.at < SUMMARY_TTL_MS) {
    return summaryCache.data
  }

  const subByUser = await loadSubByUser(admin)
  const sinceIso = startOfMonthOffset(0)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  let totalScanned = 0
  let newUsers7d = 0
  let inactive30d = 0
  let docUsersThisMonth = 0
  let pastDue = 0
  const byPlan = { free: 0, starter: 0, pro: 0 }
  let scannedAuthPages = 0
  let truncated = false

  for (let p = 1; p <= MAX_SCAN_PAGES; p += 1) {
    scannedAuthPages = p
    const { data, error } = await admin.auth.admin.listUsers({ page: p, perPage: AUTH_PAGE_SIZE })
    if (error || !data?.users?.length) break

    const batch = data.users
    const ids = batch.map((u) => u.id)
    const usageByUser = await loadUsageByUser(admin, ids, sinceIso)

    for (const u of batch) {
      totalScanned += 1
      const created = new Date(u.created_at).getTime()
      if (created >= sevenDaysAgo) newUsers7d += 1

      const last = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null
      if (!last || last < thirtyDaysAgo) inactive30d += 1

      const usage = usageByUser[u.id]
      if (usage && usage.document_generate > 0) docUsersThisMonth += 1

      const sub = subByUser[u.id]
      if (sub?.status === 'past_due') pastDue += 1

      const plan = sub?.plan_code ?? 'free'
      if (plan === 'starter') byPlan.starter += 1
      else if (plan === 'pro') byPlan.pro += 1
      else byPlan.free += 1
    }

    if (data.users.length < AUTH_PAGE_SIZE) break
    if (p === MAX_SCAN_PAGES) truncated = true
  }

  const data: UserSummary = {
    totalScanned,
    scannedAuthPages,
    truncated,
    newUsers7d,
    inactive30d,
    docUsersThisMonth,
    pastDue,
    byPlan,
    cachedAt: new Date().toISOString(),
  }
  summaryCache = { at: Date.now(), data }
  return data
}

export function invalidateUserSummaryCache() {
  summaryCache = null
}
