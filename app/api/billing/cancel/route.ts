import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { takeRateLimit } from '@/lib/security/rateLimit'
import { userBypassesPlanLimits } from '@/lib/auth/admin'

export async function POST(request: NextRequest) {
  const rate = takeRateLimit(request, 'api:billing:cancel', { windowMs: 60_000, max: 8 })
  if (!rate.ok) {
    return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 })
  }
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 요청자의 auth를 직접 확인하기 위해 server client 사용
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  if (await userBypassesPlanLimits(user.id)) {
    return NextResponse.json({
      success: true,
      message: '관리자 계정은 구독 해지 대상이 아닙니다.',
    })
  }

  await supabase
    .from('subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
