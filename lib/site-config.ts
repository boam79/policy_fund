/**
 * 배포 도메인 (OG·canonical·llms 등 공통 기준 URL)
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  return 'https://policyfund-zeta.vercel.app'
}

export const SITE_NAME = 'PolicyFund AI'
export const SITE_NAME_FULL = 'PolicyFund AI v2 — 정책자금 AI 컨설턴트'

/** SEO·GEO용 짧은 설명 */
export const SITE_DESCRIPTION =
  '실제 공공 데이터(기업마당·K-Startup·중소벤처24)로 중소기업·창업 지원사업을 검색하고, 참고용 자격 판정·서류 준비·사업계획서 초안을 제공합니다. 최종 심사·적격 여부는 주관기관이 결정합니다.'
