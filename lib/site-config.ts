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

export const SITE_NAME = '지원둥지'
export const SITE_NAME_FULL = '지원둥지 — 정부지원사업 검색·매칭·문서 초안'

/** SEO·GEO·AEO용 짧은 설명 */
export const SITE_DESCRIPTION =
  '지원둥지는 기업마당·K-Startup·중소벤처24 등 공공 데이터로 정부지원사업 공고를 검색·정리하고, 참고용 자격 확인과 서류·사업계획서 초안 작성을 돕는 서비스입니다. 적격·선정 여부는 주관기관과 공고 원문이 최종 기준입니다.'

/** 공공 API 호출 시 식별용 User-Agent (ASCII) */
export const SITE_BOT_USER_AGENT = 'JiwondungjiBot/1.0'

/** 내보내기 파일명 접두어 (ASCII) */
export const EXPORT_FILE_PREFIX = 'jiwondungji'
