/** support_programs.source 표준값·표시 라벨 */

export const PROGRAM_SOURCES = ['bizinfo', 'kstartup', 'smes24', 'manual'] as const
export type ProgramSource = (typeof PROGRAM_SOURCES)[number]

export const PROGRAM_SOURCE_LABEL: Record<string, string> = {
  bizinfo: '기업마당',
  kstartup: 'K-Startup',
  smes24: '중소벤처24',
  manual: '수동 등록',
  /** @deprecated DB·알림 레거시 — smes24 로 통일 */
  smba: '중소벤처24',
}

/** 알림·필터 레거시 smb a → smes24 */
export function normalizeProgramSource(source: string): string {
  const s = source.trim()
  if (s === 'smba') return 'smes24'
  return s
}

export function normalizeProgramSourceList(sources: string[]): string[] {
  const out = new Set<string>()
  for (const s of sources) {
    const n = normalizeProgramSource(s)
    if (n) out.add(n)
  }
  return [...out]
}

/** 공고 source 코드 → 표시 라벨 */
export function getProgramSourceLabel(source: string | null | undefined): string {
  if (!source) return ''
  return PROGRAM_SOURCE_LABEL[source] ?? source
}
