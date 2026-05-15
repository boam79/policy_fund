/**
 * 동기화된 공고 필드에 섞인 HTML을 제거해 목록·카드용 텍스트로 만든다.
 */

export function stripHtmlToText(
  input: string | null | undefined,
  options?: { maxLength?: number }
): string {
  if (input == null) return ''
  let s = String(input)
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '')
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '')
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<\/p>/gi, '\n')
  s = s.replace(/<\/li>/gi, '\n')
  s = s.replace(/<[^>]+>/g, ' ')

  const entityMap: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  }
  for (const [ent, ch] of Object.entries(entityMap)) {
    s = s.split(ent).join(ch)
  }
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))

  s = s.replace(/[ \t\f\v]+/g, ' ')
  s = s.replace(/\n{3,}/g, '\n\n')
  s = s.trim()

  const max = options?.maxLength
  if (max != null && s.length > max) {
    s = s.slice(0, max - 1).trimEnd() + '…'
  }
  return s
}
