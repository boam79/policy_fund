/**
 * 기업마당/K-Startup/중소벤처24 원본 공고 → 내부 표준 필드로 정규화
 * PRD §19.3 공통 필드 매핑 기준
 */

import type { BizinfoItem } from '../clients/bizinfo'
import type { KStartupItem } from '../clients/kstartup'
import type { Smes24Item } from '../clients/smes24'
import {
  enrichNormalizedProgram,
  inferRegionFromProgramText,
  pickBizinfoApplicationUrl,
  portalApplicationUrlFromRaw,
} from './enrichProgram'

export interface NormalizedProgram {
  source: 'bizinfo' | 'kstartup' | 'smes24'
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

/** "YYYYMMDD ~ YYYYMMDD" 형태의 기간 문자열에서 시작/종료일 파싱 */
function parseDateRange(range: string | undefined | null): { start: string | null; end: string | null } {
  if (!range) return { start: null, end: null }
  const parts = range.split('~').map(s => s.trim())
  return {
    start: toISODate(parts[0]),
    end: toISODate(parts[1] ?? parts[0]),
  }
}

export function normalizeBizinfoItem(item: BizinfoItem): NormalizedProgram {
  // 접수기간: reqstBeginEndDe ("20260101 ~ 20260331") 또는 분리 필드
  const dateRange = parseDateRange(item.reqstBeginEndDe)
  const startDate = dateRange.start ?? toISODate(item.rceptBgnde)
  const endDate = dateRange.end ?? toISODate(item.rceptEndde)

  // 기관명: jrsdInsttNm (실제) 또는 jurMnofNm (이전 호환)
  const organization = (item.jrsdInsttNm ?? item.jurMnofNm ?? item.refrncNm ?? '').trim()
  // 분야: pldirSportRealmLclasCodeNm (실제) 또는 bizTpNm (호환)
  const industry = item.pldirSportRealmLclasCodeNm ?? item.bizTpNm ?? null
  // 지원대상: trgetNm (실제) 또는 tgMbrCndCont (호환)
  const eligibility = item.trgetNm ?? item.tgMbrCndCont ?? null
  // 지원내용: bsnsSumryCn (실제) 또는 sprtCnts (호환)
  const supportContent = item.bsnsSumryCn ?? item.sprtCnts ?? null
  // 필요서류
  const docs = item.reqstMthPapersCn ?? item.rqDocuCont ?? null

  return enrichNormalizedProgram({
    source: 'bizinfo',
    external_id: item.pblancId,
    title: item.pblancNm?.trim() ?? '',
    organization,
    region: inferRegionFromProgramText(item.pblancNm ?? '', organization),
    industry,
    support_type: supportContent ?? industry,
    support_amount_min_krw: null,
    support_amount_max_krw: null,
    application_start_date: startDate,
    application_end_date: endDate,
    eligibility_text: eligibility,
    exclusion_text: null,
    required_docs: docs,
    application_url: pickBizinfoApplicationUrl(item),
    raw_content: item as unknown as Record<string, unknown>,
    status: deriveStatus(endDate),
  })
}

export function normalizeKStartupItem(item: KStartupItem): NormalizedProgram {
  const externalId = item.pbanc_sn ?? item.pbancSn ?? item.id
  const title = item.biz_pbanc_nm ?? item.pbancNm ?? ''
  const organization = item.sprv_inst ?? item.supOrgNm ?? ''
  const region = item.supt_regin ?? item.suptRegin ?? null
  const industry = item.supt_biz_clsfc ?? item.suptBizClsfc ?? null
  const startDate = toISODate(item.pbanc_rcpt_bgng_dt ?? item.rcritBgnDe)
  const endDate = toISODate(item.pbanc_rcpt_end_dt ?? item.rcritEndDe)

  return enrichNormalizedProgram({
    source: 'kstartup',
    external_id: externalId ? String(externalId) : `kstartup-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: title.trim(),
    organization: organization.trim(),
    region,
    industry,
    support_type: industry,
    support_amount_min_krw: null,
    support_amount_max_krw: null,
    application_start_date: startDate,
    application_end_date: endDate,
    eligibility_text: item.aply_trgt_ctnt ?? item.aply_trgt ?? item.tgEtrpsInfo ?? null,
    exclusion_text: null,
    required_docs: null,
    application_url: item.detl_pg_url ?? item.pbancUrl ?? null,
    raw_content: item as unknown as Record<string, unknown>,
    status: deriveStatus(endDate),
  })
}

export function normalizeSmes24Item(item: Smes24Item): NormalizedProgram {
  const externalId = item.pbancId ?? item.pblancSeq
  const organization = item.sportInsttNm ?? item.jrsdInsttNm ?? ''
  const region = item.areaNm ?? item.ereAtrgNm ?? null
  const industry = item.bizType ?? item.bizTpcdNm ?? null
  const title = item.pblancNm ?? item.pbancNm ?? item.detailBsnsNm ?? ''
  const startDate = toISODate(item.pblancBgnDt ?? item.reqstBgnDt)
  const endDate = toISODate(item.pblancEndDt ?? item.reqstEndDt)

  const portalUrl =
    portalApplicationUrlFromRaw(item as unknown as Record<string, unknown>) ??
    item.pblancDtlUrl ??
    item.pbancUrl ??
    null

  return enrichNormalizedProgram({
    source: 'smes24',
    external_id: externalId ? String(externalId) : `smes24-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: title.trim(),
    organization: organization.trim(),
    region: region?.trim() || inferRegionFromProgramText(title, organization),
    industry,
    support_type: industry,
    support_amount_min_krw: null,
    support_amount_max_krw: null,
    application_start_date: startDate,
    application_end_date: endDate,
    eligibility_text: item.sportTrget ?? item.tgtEntrpNm ?? null,
    exclusion_text: item.excluTrgetNm ?? null,
    required_docs: item.reqstRcept ?? item.reqstDocuNm ?? null,
    application_url: portalUrl,
    raw_content: item as unknown as Record<string, unknown>,
    status: deriveStatus(endDate),
  })
}
