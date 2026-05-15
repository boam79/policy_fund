/**
 * 기업마당/K-Startup 원본 공고 → 내부 표준 필드로 정규화
 * PRD §19.3 공통 필드 매핑 기준
 */

import type { BizinfoItem } from '../clients/bizinfo'
import type { KStartupItem } from '../clients/kstartup'

export interface NormalizedProgram {
  source: 'bizinfo' | 'kstartup'
  external_id: string
  title: string
  organization: string
  region: string | null
  industry: string | null
  support_type: string | null
  support_amount_min_krw: number | null
  support_amount_max_krw: number | null
  application_start_date: string | null  // ISO YYYY-MM-DD
  application_end_date: string | null    // ISO YYYY-MM-DD
  eligibility_text: string | null
  exclusion_text: string | null
  required_docs: string | null
  application_url: string | null
  raw_content: Record<string, unknown>
  status: 'active' | 'closing_soon' | 'closed' | 'unknown'
}

/** YYYYMMDD → YYYY-MM-DD */
function toISODate(raw: string | undefined | null): string | null {
  if (!raw) return null
  const s = raw.replace(/\D/g, '')
  if (s.length !== 8) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

function deriveStatus(endDateISO: string | null): NormalizedProgram['status'] {
  if (!endDateISO) return 'unknown'
  const end = new Date(endDateISO)
  const now = new Date()
  const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return 'closed'
  if (diffDays <= 7) return 'closing_soon'
  return 'active'
}

export function normalizeBizinfoItem(item: BizinfoItem): NormalizedProgram {
  const endDate = toISODate(item.rceptEndde)
  return {
    source: 'bizinfo',
    external_id: item.pblancId,
    title: item.pblancNm?.trim() ?? '',
    organization: item.jurMnofNm?.trim() ?? '',
    region: item.areaCd ?? null,
    industry: item.bizTpNm ?? null,
    support_type: item.bizTpNm ?? null,
    support_amount_min_krw: null,
    support_amount_max_krw: null,
    application_start_date: toISODate(item.rceptBgnde),
    application_end_date: endDate,
    eligibility_text: item.tgMbrCndCont ?? null,
    exclusion_text: item.sprtExclCndCont ?? null,
    required_docs: item.rqDocuCont ?? null,
    application_url: item.pblancUrl ?? null,
    raw_content: item as unknown as Record<string, unknown>,
    status: deriveStatus(endDate),
  }
}

export function normalizeKStartupItem(item: KStartupItem): NormalizedProgram {
  const endDate = toISODate(item.rcritEndDe)
  return {
    source: 'kstartup',
    external_id: item.pbancSn,
    title: item.pbancNm?.trim() ?? '',
    organization: item.supOrgNm?.trim() ?? '',
    region: item.suptRegin ?? null,
    industry: item.suptBizClsfc ?? null,
    support_type: item.suptBizClsfc ?? null,
    support_amount_min_krw: null,
    support_amount_max_krw: null,
    application_start_date: toISODate(item.rcritBgnDe),
    application_end_date: endDate,
    eligibility_text: item.tgEtrpsInfo ?? null,
    exclusion_text: null,
    required_docs: null,
    application_url: item.pbancUrl ?? null,
    raw_content: item as unknown as Record<string, unknown>,
    status: deriveStatus(endDate),
  }
}
