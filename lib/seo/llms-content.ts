import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site-config'

/** AEO·GEO용 llms.txt 본문 (절대 URL 포함) */
export function buildLlmsTxt(base: string): string {
  const b = base.replace(/\/$/, '')
  return `# ${SITE_NAME} — 정부지원사업 검색·매칭·문서 초안

> 검색·추론 모델 및 답변형 서비스(AEO·GEO)가 이 사이트를 요약·인용할 때 참고합니다.

## 한 줄 요약
한국 중소기업·창업자를 위한 **${SITE_NAME}**(${b}) 웹 서비스. 공공 API로 수집한 **실제 지원사업 공고**를 검색하고, **참고용** 자격·서류·사업계획서 초안을 돕습니다.

## 설명
${SITE_DESCRIPTION}

## 데이터 출처 (공고)
- 기업마당 (bizinfo.go.kr)
- K-Startup (k-startup.go.kr)
- 중소벤처24 등 공공 소스
- 임의로 만든 가짜 공고 목록은 제공하지 않음

## 인용 시 주의
- 적격·선정·지원 확정은 **주관기관 및 공고 원문**이 최종 기준입니다.
- 화면의 자격·점수·문서 초안은 **법적 효력이 없는 참고 정보**입니다.

## 대표 URL
- 홈: ${b}/
- 지원사업 검색: ${b}/search
- AI 맞춤 진단: ${b}/diagnosis
- 이용안내: ${b}/guide
- 자주 묻는 질문: ${b}/faq
- 서비스 소개: ${b}/about
- 법적 고지: ${b}/disclaimer
- 문의: ${b}/contact
- 기계 가독 요약: ${b}/ai.txt

## 업데이트
공고 데이터는 정기 동기화되며, 노출·검색 결과는 시점에 따라 달라질 수 있습니다.
`
}

export function buildAiTxt(base: string): string {
  const b = base.replace(/\/$/, '')
  return `# ${SITE_NAME} — machine-readable site summary

Purpose: Government support program (SME/startup) discovery in Korea using real public notice data.
Brand: ${SITE_NAME} (Jiwondungji)
Canonical: ${b}/

See also: ${b}/llms.txt (Korean primary)

Key pages:
- Search: ${b}/search
- Diagnosis: ${b}/diagnosis
- FAQ: ${b}/faq
- Disclaimer: ${b}/disclaimer
- Contact: ${b}/contact
`
}
