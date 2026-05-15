const SENSITIVE_KEYS = [
  'password',
  'secret',
  'token',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'set-cookie',
  'key',
]

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  return SENSITIVE_KEYS.some((s) => lower.includes(s))
}

function maskString(value: string): string {
  if (value.length <= 6) return '***'
  return `${value.slice(0, 2)}***${value.slice(-2)}`
}

export function maskSensitive<T>(input: T): T {
  if (input == null) return input

  if (typeof input === 'string') {
    return input as T
  }

  if (Array.isArray(input)) {
    return input.map((v) => maskSensitive(v)) as T
  }

  if (typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (isSensitiveKey(k)) {
        out[k] = typeof v === 'string' ? maskString(v) : '***'
        continue
      }
      if (typeof v === 'string' && isSensitiveKey(k)) {
        out[k] = maskString(v)
      } else if (typeof v === 'object' && v !== null) {
        out[k] = maskSensitive(v)
      } else {
        out[k] = v
      }
    }
    return out as T
  }

  return input
}
