import { timingSafeEqual } from 'node:crypto'

/** 타이밍 공격 완화 비교 (웹훅·Cron 시크릿 등) */
export function secretsEqual(received: string | null | undefined, expected: string | null | undefined): boolean {
  if (received == null || expected == null) return false
  const a = Buffer.from(String(received), 'utf8')
  const b = Buffer.from(String(expected), 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
