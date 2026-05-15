import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export async function POST() {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 요청자의 auth를 직접 확인하기 위해 server client 사용
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  await supabase
    .from('subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
