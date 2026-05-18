/**
 * 지원둥지 「실질적 전부」 수집 정책 (Vercel·Supabase 무료 플랜 기준)
 *
 * - 기업마당: API totCnt 전부 (로컬 무제한 페이지)
 * - K-Startup: 모집 중(rcrtPrgsYn=Y) 전부
 * - 중소벤처24: 최근 SMES24_LOOKBACK_DAYS(기본 730일)
 * - status=closed(접수 마감) 공고는 신규 upsert 생략, 기존 행만 마감 처리
 *
 * Vercel Hobby는 함수 시간 제한 → 전량은 `npm run sync`(로컬) 권장.
 */

export type SyncSource = 'bizinfo' | 'kstartup' | 'smes24' | 'all'

export const SYNC_POLICY = {
  bizinfo: {
    label: '기업마당',
    description: 'API totCnt 전부 (~1,300건)',
  },
  kstartup: {
    label: 'K-Startup',
    description: '모집 중 공고 전부',
    rcrtPrgsYn: 'Y' as const,
  },
  smes24: {
    label: '중소벤처24',
    description: '최근 730일(약 2년) 공고',
    lookbackDays: 730,
  },
} as const

/** 중소벤처24 조회 기간(일) — env로 덮어쓰기 가능 */
export function smes24LookbackDays(): number {
  const n = Number(process.env.SYNC_SMES24_LOOKBACK_DAYS ?? String(SYNC_POLICY.smes24.lookbackDays))
  return Number.isFinite(n) && n > 0 ? Math.min(n, 3660) : SYNC_POLICY.smes24.lookbackDays
}

/** Vercel 런타임 출처당 최대 페이지 (Hobby 타임아웃 완화) */
export function vercelMaxPagesPerSource(): number {
  const n = Number(process.env.SYNC_VERCEL_SAFE_MAX_PAGES ?? '10')
  return Number.isFinite(n) && n > 0 ? Math.min(n, 40) : 10
}

/** 동기화 검증용 기업마당 API 샘플 페이지 (동기화 totCnt와 맞추려면 14~16) */
export function bizinfoVerifyMaxPages(): number {
  const n = Number(process.env.BIZINFO_VERIFY_MAX_PAGES ?? '16')
  return Number.isFinite(n) && n > 0 ? Math.min(n, 40) : 16
}

export function parseSyncSource(raw: string | null | undefined): SyncSource {
  const v = String(raw ?? 'all').trim().toLowerCase()
  if (v === 'bizinfo' || v === 'kstartup' || v === 'smes24') return v
  return 'all'
}

export function syncSourcesFor(source: SyncSource): Exclude<SyncSource, 'all'>[] {
  if (source === 'all') return ['bizinfo', 'kstartup', 'smes24']
  return [source]
}

export function localSyncCommand(): string {
  return 'npm run sync'
}
