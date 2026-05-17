/**
 * 카카오페이 온라인 단건 결제 — https://developers.kakaopay.com/docs/payment/online/common
 * Context7: /websites/developers_kakaopay
 */

const API_BASE = 'https://open-api.kakaopay.com'

export function getKakaoPayServerConfig() {
  const pgEnabled = process.env.PAYMENT_PG_ENABLED === 'true'
  const cid = process.env.KAKAO_PAY_CID?.trim() ?? ''
  const secretKey = process.env.KAKAO_PAY_SECRET_KEY?.trim() ?? ''
  const ready = pgEnabled && Boolean(cid && secretKey)
  return { pgEnabled, cid, secretKey, ready }
}

export function getKakaoPayPublicConfig() {
  const pgEnabled = process.env.NEXT_PUBLIC_PAYMENT_PG_ENABLED === 'true'
  const cid = process.env.NEXT_PUBLIC_KAKAO_PAY_CID?.trim() ?? ''
  return { pgEnabled: pgEnabled && Boolean(cid), cid }
}

function authHeader(secretKey: string) {
  return `SECRET_KEY ${secretKey}`
}

/** 부가세 포함 금액 → total / vat / 면세 (문서: total = tax_free + taxable + vat) */
export function splitAmountForKakao(total: number) {
  const vat = Math.round(total / 11)
  return {
    total_amount: String(total),
    vat_amount: String(vat),
    tax_free_amount: '0',
  }
}

export interface KakaoReadyResponse {
  tid: string
  next_redirect_pc_url?: string
  next_redirect_mobile_url?: string
  next_redirect_app_url?: string
}

export interface KakaoApproveResponse {
  tid: string
  aid: string
  partner_order_id: string
  partner_user_id: string
  item_name?: string
  amount?: { total?: number }
}

async function kakaoPost<T>(path: string, body: Record<string, unknown>): Promise<{
  ok: boolean
  status: number
  data: T & { error_code?: string; error_message?: string }
}> {
  const cfg = getKakaoPayServerConfig()
  if (!cfg.ready) {
    return { ok: false, status: 503, data: { error_code: 'NOT_READY' } as T & { error_code?: string } }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(cfg.secretKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })

  const data = (await res.json().catch(() => ({}))) as T & {
    error_code?: string
    error_message?: string
  }
  return { ok: res.ok, status: res.status, data }
}

/** 결제 준비 — POST /online/v1/payment/ready */
export async function kakaoPaymentReady(params: {
  partner_order_id: string
  partner_user_id: string
  item_name: string
  total_amount: number
  approval_url: string
  cancel_url: string
  fail_url: string
}) {
  const cfg = getKakaoPayServerConfig()
  const amounts = splitAmountForKakao(params.total_amount)

  return kakaoPost<KakaoReadyResponse>('/online/v1/payment/ready', {
    cid: cfg.cid,
    partner_order_id: params.partner_order_id,
    partner_user_id: params.partner_user_id,
    item_name: params.item_name,
    quantity: '1',
    ...amounts,
    approval_url: params.approval_url,
    cancel_url: params.cancel_url,
    fail_url: params.fail_url,
  })
}

/** 결제 승인 — POST /online/v1/payment/approve */
export async function kakaoPaymentApprove(params: {
  tid: string
  partner_order_id: string
  partner_user_id: string
  pg_token: string
}) {
  const cfg = getKakaoPayServerConfig()

  return kakaoPost<KakaoApproveResponse>('/online/v1/payment/approve', {
    cid: cfg.cid,
    tid: params.tid,
    partner_order_id: params.partner_order_id,
    partner_user_id: params.partner_user_id,
    pg_token: params.pg_token,
  })
}

export function pickKakaoRedirectUrl(
  data: KakaoReadyResponse,
  userAgent: string | null
): string | null {
  const ua = (userAgent ?? '').toLowerCase()
  const mobile = /mobile|android|iphone|ipad/.test(ua)
  if (mobile && data.next_redirect_mobile_url) return data.next_redirect_mobile_url
  return data.next_redirect_pc_url ?? data.next_redirect_mobile_url ?? data.next_redirect_app_url ?? null
}
