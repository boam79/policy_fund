import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isAdminUser } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!(await isAdminUser())) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: '결제 데이터를 불러오지 못했습니다.' }, { status: 500 })
    }

    const payments = data ?? []
    const donePayments = payments.filter((p) => p.status === 'done')

    return NextResponse.json({
      payments,
      stats: {
        total: payments.length,
        done: donePayments.length,
        amount: donePayments.reduce((sum, p) => sum + (p.amount_krw ?? 0), 0),
      },
    })
  } catch (err) {
    console.error('[api/admin/billing]', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
