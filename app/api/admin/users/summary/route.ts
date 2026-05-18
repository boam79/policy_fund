import { isAdminUser } from '@/lib/auth/admin'
import { computeUserSummary, createAdminAuthClient } from '@/lib/admin/userDirectory'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await isAdminUser())) {
    return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const admin = createAdminAuthClient()
  if (!admin) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 필요' }, { status: 503 })
  }

  const summary = await computeUserSummary(admin)
  return Response.json({ ok: true, summary })
}
