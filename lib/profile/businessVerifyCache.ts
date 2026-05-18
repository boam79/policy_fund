import type { NtsValidateInput, NtsValidateRow, NtsStatusRow } from '@/lib/gov-support/clients/ntsBusinessman'

type CacheEntry<T> = { at: number; value: T }

const TTL_MS = 24 * 60 * 60 * 1000
const GLOBAL_KEY = '__pf_business_verify_cache__'

type Store = {
  validate: Map<string, CacheEntry<NtsValidateRow[]>>
  status: Map<string, CacheEntry<NtsStatusRow[]>>
}

function store(): Store {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Store }
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { validate: new Map(), status: new Map() }
  }
  return g[GLOBAL_KEY]!
}

function validateKey(input: NtsValidateInput): string {
  return `v:${input.b_no}:${input.start_dt}:${input.p_nm}:${input.b_nm ?? ''}`
}

function statusKey(bNos: string[]): string {
  return `s:${[...bNos].sort().join(',')}`
}

export function getCachedValidate(input: NtsValidateInput): NtsValidateRow[] | null {
  const hit = store().validate.get(validateKey(input))
  if (!hit || Date.now() - hit.at > TTL_MS) return null
  return hit.value
}

export function setCachedValidate(input: NtsValidateInput, rows: NtsValidateRow[]): void {
  store().validate.set(validateKey(input), { at: Date.now(), value: rows })
}

export function getCachedStatus(bNos: string[]): NtsStatusRow[] | null {
  const hit = store().status.get(statusKey(bNos))
  if (!hit || Date.now() - hit.at > TTL_MS) return null
  return hit.value
}

export function setCachedStatus(bNos: string[], rows: NtsStatusRow[]): void {
  store().status.set(statusKey(bNos), { at: Date.now(), value: rows })
}
