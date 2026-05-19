/**
 * GET /api/cron/alerts — 마감·신규 공고 알림 배치 (CRON_SECRET Bearer)
 * 이메일 발송은 RESEND_API_KEY 설정 시에만 동작, 없으면 로그·JSON 요약만 반환
 */

import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'
import { isCronBearerAuthorized } from '@/lib/security/cronAuth'
import { matchProgramsForAlert, type AlertProfileInput } from '@/lib/alerts/matchPrograms'
import { getSiteUrl } from '@/lib/site-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DIGEST_HOURS = 24

export async function GET(request: NextRequest) {
  if (!isCronBearerAuthorized(request)) {
    return Response.json({ ok: false, message: '인증이 필요합니다.' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    return Response.json({ ok: false, message: 'SUPABASE_SERVICE_ROLE_KEY 필요' }, { status: 503 })
  }

  const sinceIso = new Date(Date.now() - DIGEST_HOURS * 60 * 60 * 1000).toISOString()

  const { data: profiles, error: profErr } = await supabase
    .from('alert_profiles')
    .select('*')
    .eq('is_active', true)
    .limit(200)

  if (profErr) {
    return Response.json({ ok: false, message: profErr.message }, { status: 500 })
  }

  const { data: programs, error: progErr } = await supabase
    .from('support_programs')
    .select(
      'id, title, source, region, industry, industry_tags, status, application_end_date, created_at, synced_at'
    )
    .in('status', ['active', 'closing_soon'])
    .limit(3000)

  if (progErr) {
    return Response.json({ ok: false, message: progErr.message }, { status: 500 })
  }

  const resendKey = process.env.RESEND_API_KEY?.trim()
  const fromEmail = process.env.ALERT_FROM_EMAIL?.trim() || 'alerts@policyfund.local'

  let usersProcessed = 0
  let totalMatches = 0
  let emailsSent = 0
  const summaries: { user_id: string; match_count: number; emailed: boolean }[] = []

  for (const row of profiles ?? []) {
    const ext = row as Record<string, unknown>
    const input: AlertProfileInput = {
      regions: (row.regions ?? []) as string[],
      industries: (row.industries ?? []) as string[],
      sources: (row.sources ?? []) as string[],
      keywords: (row.keywords ?? []) as string[],
      notify_days_before:
        typeof ext.notify_days_before === 'number' ? ext.notify_days_before : 7,
      notify_new_programs:
        typeof ext.notify_new_programs === 'boolean' ? ext.notify_new_programs : true,
    }

    const matches = matchProgramsForAlert(programs ?? [], input, { sinceIso })
    if (matches.length === 0) continue

    usersProcessed += 1
    totalMatches += matches.length

    let emailed = false
    if (resendKey && row.user_id) {
      const { data: userRow } = await supabase.auth.admin.getUserById(row.user_id)
      const email = userRow?.user?.email
      if (email) {
        const subject = `[지원둥지] 맞춤 공고 ${matches.length}건`
        const siteUrl = getSiteUrl()
        const manageUrl = `${siteUrl}/mypage/alerts`
        const lines = matches
          .slice(0, 15)
          .map((m) => {
            const tag = m.reason === 'new_program' ? '신규' : `마감 D-${m.days_until_deadline ?? '?'}`
            const href = `${siteUrl}/search/${m.program_id}`
            return `· [${tag}] <a href="${href}">${m.title}</a> (${m.source})`
          })
          .join('<br/>')
        const html = `<p>조건에 맞는 공고 ${matches.length}건입니다.</p><p>${lines}</p><p style="margin-top:16px;font-size:12px;color:#666"><a href="${manageUrl}">알림 설정 변경</a> · 수신을 원치 않으시면 마이페이지에서 알림을 끄거나 <a href="${manageUrl}">여기</a>에서 설정을 변경해 주세요.</p>`

        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [email],
              subject,
              html,
            }),
          })
          if (res.ok) {
            emailed = true
            emailsSent += 1
            await supabase
              .from('alert_profiles')
              .update({ last_digest_at: new Date().toISOString() })
              .eq('id', row.id)
          }
        } catch (e) {
          console.error('[cron/alerts] resend', e)
        }
      }
    }

    summaries.push({ user_id: row.user_id ?? '', match_count: matches.length, emailed })
    console.info('[cron/alerts]', row.user_id, matches.length, 'matches', emailed ? 'emailed' : 'log-only')
  }

  return Response.json({
    ok: true,
    users_processed: usersProcessed,
    total_matches: totalMatches,
    emails_sent: emailsSent,
    email_enabled: Boolean(resendKey),
    since_iso: sinceIso,
    summaries: summaries.slice(0, 20),
  })
}
