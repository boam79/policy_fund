/**
 * 국세청 사업자등록정보 진위확인·상태조회 (odcloud)
 * https://www.data.go.kr/data/15081808/openapi.do
 */

const BASE = 'https://api.odcloud.kr/api/nts-businessman/v1'

export type NtsValidateInput = {
  b_no: string
  start_dt: string
  p_nm: string
  b_nm?: string
  b_adr?: string
}

export type NtsValidateRow = {
  b_no?: string
  valid?: string
  valid_msg?: string
  status?: Record<string, unknown>
}

export type NtsStatusRow = {
  b_no?: string
  b_stt?: string
  b_stt_cd?: string
  tax_type?: string
  end_dt?: string
}

function getServiceKey(): string | null {
  const key = process.env.PUBLIC_DATA_SERVICE_KEY?.trim()
  return key || null
}

async function postNts<T>(path: 'validate' | 'status', body: unknown): Promise<T> {
  const serviceKey = getServiceKey()
  if (!serviceKey) {
    throw new Error('PUBLIC_DATA_SERVICE_KEY가 설정되지 않았습니다.')
  }

  const qs = new URLSearchParams({
    serviceKey,
    returnType: 'JSON',
  })

  const res = await fetch(`${BASE}/${path}?${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const msg =
      typeof json.message === 'string'
        ? json.message
        : typeof json.msg === 'string'
          ? json.msg
          : `국세청 API 오류 (${res.status})`
    throw new Error(msg)
  }

  const code = String(json.status_code ?? json.code ?? '')
  if (code && code !== 'OK' && code !== '0') {
    throw new Error(String(json.message ?? json.msg ?? '국세청 API 응답 오류'))
  }

  return json as T
}

/** 진위확인 — valid 01=일치, 02=불일치 */
export async function validateBusinesses(
  businesses: NtsValidateInput[]
): Promise<NtsValidateRow[]> {
  if (businesses.length === 0) return []
  if (businesses.length > 100) {
    throw new Error('한 번에 최대 100건까지 확인할 수 있습니다.')
  }
  const payload = await postNts<{ data?: NtsValidateRow[] }>('validate', { businesses })
  return Array.isArray(payload.data) ? payload.data : []
}

/** 상태조회 — 휴업/폐업 등 */
export async function statusBusinesses(bNos: string[]): Promise<NtsStatusRow[]> {
  const unique = [...new Set(bNos.map((n) => n.replace(/\D/g, '')).filter((n) => n.length === 10))]
  if (unique.length === 0) return []
  if (unique.length > 100) {
    throw new Error('한 번에 최대 100건까지 조회할 수 있습니다.')
  }
  const payload = await postNts<{ data?: NtsStatusRow[] }>('status', { b_no: unique })
  return Array.isArray(payload.data) ? payload.data : []
}

export function isValidateMatch(row: NtsValidateRow | undefined): boolean {
  return row?.valid === '01'
}

export function businessStatusLabel(sttCd: string | undefined): string {
  switch (sttCd) {
    case '01':
      return '계속사업자'
    case '02':
      return '휴업'
    case '03':
      return '폐업'
    default:
      return sttCd ? `상태코드 ${sttCd}` : '확인 불가'
  }
}
