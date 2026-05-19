const URL_IN_TEXT_RE = /https?:\/\/[^\s"'<>)\]]+/gi
const SEARCH_PARAM_KEYS = ['bizCyclId', 'ancmId', 'TSK_PBNC_ID', 'pblancId', 'pbancId', 'idx', 'upperNo']

function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, '&').trim()
}

function tokensFromUrl(url: string, out: Set<string>) {
  try {
    const u = new URL(url)
    out.add(u.hostname.replace(/^www\./, ''))
    for (const [key, value] of u.searchParams) {
      if (value.length >= 3) out.add(value)
      if (SEARCH_PARAM_KEYS.includes(key) && value) out.add(`${key}=${value}`)
    }
    for (const seg of u.pathname.split('/')) {
      if (/^[A-Za-z0-9_-]{5,}$/.test(seg)) out.add(seg)
    }
  } catch {
    /* ignore */
  }
}

/** URL·외부ID·raw 숫자 ID — search_text 컬럼용 (검색 전용, UI 노출 X) */
export function buildProgramSearchText(input: {
  external_id: string
  application_url?: string | null
  raw_content?: Record<string, unknown> | null
}): string | null {
  const tokens = new Set<string>()
  const ext = input.external_id?.trim()
  if (ext && ext.length >= 3) tokens.add(ext)

  const raw = input.raw_content ?? {}
  for (const key of ['pblancSeq', 'pbanc_sn', 'pbancSn', 'pblancId', 'pbancId']) {
    const v = raw[key]
    if (v != null && String(v).trim().length >= 3) tokens.add(String(v).trim())
  }

  if (input.application_url) tokensFromUrl(input.application_url, tokens)

  for (const key of ['rceptEngnHmpgUrl', 'reqstLinkInfo', 'refrncUrl', 'pblancDtlUrl', 'detl_pg_url']) {
    const v = raw[key]
    if (typeof v === 'string' && v.startsWith('http')) tokensFromUrl(decodeHtml(v), tokens)
  }

  const html = [
    raw.bsnsSumryCn,
    raw.reqstMthPapersCn,
    raw.sportCnts,
    raw.policyCnts,
  ]
    .filter((v) => typeof v === 'string')
    .join(' ')
  for (const m of html.matchAll(URL_IN_TEXT_RE)) {
    tokensFromUrl(decodeHtml(m[0]), tokens)
  }

  const line = [...tokens].filter((t) => t.length >= 3).join(' ')
  return line || null
}
