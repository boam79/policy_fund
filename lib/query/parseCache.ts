import { createHash } from 'crypto'
import type { ParseNLResult } from './parseNaturalLanguage'
import type { BusinessConditions } from '@/types'

const TTL_MS = 24 * 60 * 60 * 1000
const MAX_ENTRIES = 500

type ParseCacheEntry = {
  parsed: ParseNLResult
  conditions: BusinessConditions
  expiresAt: number
}

const cache = new Map<string, ParseCacheEntry>()

export function normalizeParseQueryForCache(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function parseCacheKey(query: string): string {
  return createHash('sha256').update(normalizeParseQueryForCache(query)).digest('hex')
}

export function getParseCache(query: string): ParseCacheEntry | null {
  const key = parseCacheKey(query)
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry
}

export function setParseCache(
  query: string,
  data: { parsed: ParseNLResult; conditions: BusinessConditions }
): void {
  const key = parseCacheKey(query)
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { ...data, expiresAt: Date.now() + TTL_MS })
}

/** 검증·로그용 */
export function parseCacheSize(): number {
  return cache.size
}
