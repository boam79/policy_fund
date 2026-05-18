/**
 * 베타 운영: 로그인 회원에게 유료 플랜 한도·기능 제한을 적용하지 않음.
 * 정식 오픈 시 `BETA_ALL_ACCESS=false` 로 비활성화.
 */
export function isBetaOpenAccessEnabled(): boolean {
  const raw = process.env.BETA_ALL_ACCESS?.trim().toLowerCase()
  if (raw === 'false' || raw === '0' || raw === 'no') return false
  if (raw === 'true' || raw === '1' || raw === 'yes') return true
  return true
}

export function betaGrantsFullAccess(userId: string | null | undefined): boolean {
  return Boolean(userId) && isBetaOpenAccessEnabled()
}
