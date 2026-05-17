/** 네이버페이 연동 설정 — https://docs.pay.naver.com/docs/common/url-format */

export type NaverPayMode = 'development' | 'production'

const APPLY_PATH = '/naverpay-partner/naverpay/payments/v2.2/apply/payment'

export function getNaverPayApiBase(mode: NaverPayMode): string {
  return mode === 'production'
    ? 'https://pay.paygate.naver.com'
    : 'https://dev-pay.paygate.naver.com'
}

export function getNaverPayServerConfig() {
  const pgEnabled = process.env.PAYMENT_PG_ENABLED === 'true'
  const clientId = process.env.NAVER_PAY_CLIENT_ID?.trim() ?? ''
  const clientSecret = process.env.NAVER_PAY_CLIENT_SECRET?.trim() ?? ''
  const chainId = process.env.NAVER_PAY_CHAIN_ID?.trim() ?? ''
  const mode: NaverPayMode =
    process.env.NAVER_PAY_MODE === 'production' ? 'production' : 'development'
  const apiBase = getNaverPayApiBase(mode)
  const ready = pgEnabled && Boolean(clientId && clientSecret && chainId)
  return { pgEnabled, clientId, clientSecret, chainId, mode, apiBase, ready, applyUrl: `${apiBase}${APPLY_PATH}` }
}

export function getNaverPayPublicConfig() {
  const pgEnabled = process.env.NEXT_PUBLIC_PAYMENT_PG_ENABLED === 'true'
  const clientId = process.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_ID?.trim() ?? ''
  const chainId = process.env.NEXT_PUBLIC_NAVER_PAY_CHAIN_ID?.trim() ?? ''
  const mode: NaverPayMode =
    process.env.NEXT_PUBLIC_NAVER_PAY_MODE === 'production' ? 'production' : 'development'
  return {
    pgEnabled: pgEnabled && Boolean(clientId && chainId),
    clientId,
    chainId,
    mode,
  }
}

export interface NaverApplyDetail {
  paymentId?: string
  merchantPayKey?: string
  merchantUserKey?: string
  admissionState?: string
  totalPayAmount?: number
  productName?: string
}

export interface NaverApplyResponse {
  code?: string
  message?: string
  body?: {
    paymentId?: string
    detail?: NaverApplyDetail
  }
}

/** 단건 결제 승인 — POST apply/payment */
export async function applyNaverPayment(paymentId: string): Promise<{
  ok: boolean
  status: number
  data: NaverApplyResponse
}> {
  const cfg = getNaverPayServerConfig()
  if (!cfg.ready) {
    return { ok: false, status: 503, data: { code: 'NotConfigured', message: 'NAVER_PAY_NOT_READY' } }
  }

  const body = new URLSearchParams({ paymentId })
  const res = await fetch(cfg.applyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Naver-Client-Id': cfg.clientId,
      'X-Naver-Client-Secret': cfg.clientSecret,
      'X-NaverPay-Chain-Id': cfg.chainId,
      'X-NaverPay-Idempotency-Key': `apply-${paymentId}`,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(60_000),
  })

  const data = (await res.json().catch(() => ({}))) as NaverApplyResponse
  const ok = res.ok && data.code === 'Success' && data.body?.detail?.admissionState === 'SUCCESS'
  return { ok, status: res.status, data }
}

/** 구독형 디지털 상품 — FDS용 productItems (ETC) */
export function buildSubscriptionProductItems(planId: string, planName: string, count = 1) {
  return [
    {
      categoryType: 'ETC',
      categoryId: 'ETC',
      uid: `plan-${planId}`,
      name: planName,
      payReferrer: 'ETC',
      count,
    },
  ]
}
