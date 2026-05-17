import { CANONICAL_INDUSTRIES, toCanonicalIndustry } from './canonical'

const CANONICAL_SET = new Set<string>(CANONICAL_INDUSTRIES)

type Tag = (typeof CANONICAL_INDUSTRIES)[number]

const RULES: { tag: Tag; patterns: RegExp[] }[] = [
  {
    tag: 'IT/소프트웨어',
    patterns: [
      /소프트웨어/i,
      /SW\b/i,
      /\bIT\b/i,
      /ICT/i,
      /정보\s*통신/i,
      /디지털/i,
      /\bAI\b/i,
      /인공지능/i,
      /빅데이터/i,
      /테크/i,
      /스타트업/i,
      /앱\s*개발/i,
      /플랫폼/i,
    ],
  },
  {
    tag: '제조업',
    patterns: [/제조/i, /공장/i, /생산\s*설비/i, /스마트\s*공장/i],
  },
  {
    tag: '유통/도소매',
    patterns: [/도소매/i, /유통/i, /리테일/i, /판매\s*채널/i],
  },
  {
    tag: '음식/외식',
    patterns: [/외식/i, /음식/i, /요식/i, /식품(?!산업)/i, /푸드/i],
  },
  {
    tag: '건설업',
    patterns: [/건설/i, /토목/i, /건축/i],
  },
  {
    tag: '서비스업',
    patterns: [/서비스\s*업/i, /용역/i, /컨설팅/i],
  },
]

function blobFrom(input: {
  title?: string | null
  industry?: string | null
  eligibility_text?: string | null
  support_type?: string | null
}): string {
  return [input.title, input.industry, input.eligibility_text, input.support_type]
    .filter((s): s is string => Boolean(s?.trim()))
    .join(' ')
}

/** 제목·지원대상·분야 텍스트에서 표준 업종 태그 추론 (규칙 기반, 동기화 시 사용) */
export function inferIndustryTags(input: {
  title?: string | null
  industry?: string | null
  eligibility_text?: string | null
  support_type?: string | null
}): string[] {
  const blob = blobFrom(input)
  const tags = new Set<string>()

  if (input.industry?.trim()) {
    const canonical = toCanonicalIndustry(input.industry.trim())
    if (CANONICAL_SET.has(canonical)) tags.add(canonical)
  }

  for (const { tag, patterns } of RULES) {
    if (patterns.some((p) => p.test(blob))) tags.add(tag)
  }

  if (tags.size === 0 && /전\s*업종|업종\s*무관|제한\s*없음/i.test(blob)) {
    tags.add('기타')
  }

  return [...tags]
}
