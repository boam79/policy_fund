/**
 * JSON-LD를 script 태그에 넣을 때 `</script>`·U+2028/U+2029 이스케이프로 XSS·파싱 깨짐 방지.
 * @see https://redux.js.org/usage/nextjs#security-considerations
 */
export function safeJsonLdStringify(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
