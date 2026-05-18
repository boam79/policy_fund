import type { NextRequest } from 'next/server'
import { isAdminUser } from '@/lib/auth/admin'
import {
  createAdminAuthClient,
  loadSubByUser,
  scanAuthUsers,
  startOfMonthOffset,
  type ListFilters,
} from '@/lib/admin/userDirectory'

export const dynamic = 'force-dynamic'

function parseFilters(searchParams: URLSearchParams): ListFilters {
  return {
    q: searchParams.get('q') ?? undefined,
    plan: searchParams.get('plan') ?? 'all',
    status: searchParams.get('status') ?? 'all',
    inactiveDays: Number(searchParams.get('inactiveDays')) || undefined,
    minDocuments: Number(searchParams.get('minDocuments')) || undefined,
    domain: searchParams.get('domain') ?? undefined,
    segment: searchParams.get('segment') ?? undefined,
    sort: searchParams.get('sort') ?? 'created_desc',
  }
}

function csvEscape(v: string | number | boolean | null | undefined): string {
  const s = v == null ? '' : String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(request: NextRequest) {
  if (!(await isAdminUser())) {
    return new Response('관리자 권한이 필요합니다.', { status: 403 })
  }

  const admin = createAdminAuthClient()
  if (!admin) {
    return new Response('SUPABASE_SERVICE_ROLE_KEY 필요', { status: 503 })
  }

  const filters = parseFilters(request.nextUrl.searchParams)
  const subByUser = await loadSubByUser(admin)
  const sinceIso = startOfMonthOffset(0)
  const { rows } = await scanAuthUsers(admin, subByUser, sinceIso, filters)

  const header = [
    'email',
    'plan',
    'subscription_status',
    'created_at',
    'last_sign_in_at',
    'eligibility_check',
    'document_generate',
    'evaluation',
    'cancel_at_period_end',
  ]
  const lines = [header.join(',')]
  for (const u of rows) {
    lines.push(
      [
        csvEscape(u.email),
        csvEscape(u.plan),
        csvEscape(u.subscription_status),
        csvEscape(u.created_at),
        csvEscape(u.last_sign_in_at),
        u.usage.eligibility_check,
        u.usage.document_generate,
        u.usage.evaluation,
        u.cancel_at_period_end ? 'yes' : '',
      ].join(',')
    )
  }

  const body = '\uFEFF' + lines.join('\n')
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="members-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
