/**
 * verify-*.ts 공통 HTTP 헬퍼
 */
/* eslint-disable no-console */

export type VerifyJson = Record<string, unknown>

export const STORY_BASE_URL = process.env.STORY_BASE_URL ?? 'http://localhost:3000'
export const VERIFY_BASE_URL = process.env.VERIFY_BASE_URL ?? STORY_BASE_URL

export const STORY_SESSION_COOKIE = process.env.STORY_SESSION_COOKIE?.trim()

export function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg)
}

export function withStoryAuth(init?: RequestInit): RequestInit {
  if (!STORY_SESSION_COOKIE) return init ?? {}
  const h = new Headers(init?.headers)
  h.set('Cookie', STORY_SESSION_COOKIE)
  return { ...init, headers: h }
}

export async function fetchJson(
  base: string,
  path: string,
  init?: RequestInit
): Promise<{ status: number; json: VerifyJson; text: string; headers: Headers }> {
  const res = await fetch(`${base}${path}`, init)
  const text = await res.text()
  let json: VerifyJson = {}
  try {
    json = text ? (JSON.parse(text) as VerifyJson) : {}
  } catch {
    json = { raw: text.slice(0, 500) }
  }
  return { status: res.status, json, text, headers: res.headers }
}

export async function fetchStoryJson(path: string, init?: RequestInit) {
  return fetchJson(STORY_BASE_URL, path, withStoryAuth(init))
}

export async function fetchVerifyJson(path: string, init?: RequestInit) {
  return fetchJson(VERIFY_BASE_URL, path, init)
}

export async function fetchPage(base: string, path: string) {
  const res = await fetch(`${base}${path}`)
  const text = await res.text()
  return { status: res.status, text }
}
