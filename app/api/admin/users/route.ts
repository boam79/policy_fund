import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/auth/admin'
import {
  createAdminAuthClient,
  loadSubByUser,
  loadUsageByUser,
  mapAuthUser,
  needsFullScan,
  scanAuthUsers,
  sortUsers,
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

export async function GET(request: NextRequest) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const admin = createAdminAuthClient()
  if (!admin) {
    return NextResponse.json(
      { error: '회원 목록 조회에는 SUPABASE_SERVICE_ROLE_KEY가 서버에 설정되어 있어야 합니다.' },
      { status: 503 }
    )
  }

  const { searchParams } = request.nextUrl
  const filters = parseFilters(searchParams)
  const page = Math.min(Math.max(Number(searchParams.get('page')) || 1, 1), 500)
  const perPage = Math.min(Math.max(Number(searchParams.get('perPage')) || 40, 10), 100)
  const sinceIso = startOfMonthOffset(0)
  const subByUser = await loadSubByUser(admin)

  if (needsFullScan(filters)) {
    const { rows, scannedAuthPages } = await scanAuthUsers(admin, subByUser, sinceIso, filters)
    const total = rows.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * perPage
    const users = rows.slice(start, start + perPage)

    return NextResponse.json({
      users,
      page: safePage,
      perPage,
      total,
      totalPages,
      hasMore: safePage < totalPages,
      query: filters.q || null,
      scannedAuthPages,
      scanMode: true,
    })
  }

  const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
  if (error) {
    return NextResponse.json({ error: error.message || '회원 목록을 불러오지 못했습니다.' }, { status: 500 })
  }

  const batch = data?.users ?? []
  const userIds = batch.map((u) => u.id).filter(Boolean)
  const usageByUser = await loadUsageByUser(admin, userIds, sinceIso)
  const rows = batch.map((u) =>
    mapAuthUser(
      u,
      subByUser,
      usageByUser[u.id] ?? { eligibility_check: 0, document_generate: 0, evaluation: 0 }
    )
  )

  return NextResponse.json({
    users: sortUsers(rows, filters.sort ?? 'created_desc'),
    page,
    perPage,
    hasMore: batch.length === perPage,
    total: null,
    totalPages: null,
    query: null,
    scannedAuthPages: page,
    scanMode: false,
  })
}
