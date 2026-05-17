import { getKakaoPayPublicConfig, getKakaoPayServerConfig } from '@/lib/billing/kakaopay'
import { getNaverPayPublicConfig, getNaverPayServerConfig } from '@/lib/billing/naverpay'

export function getPaymentProvidersStatus() {
  const naverPublic = getNaverPayPublicConfig()
  const kakaoPublic = getKakaoPayPublicConfig()
  const naverServer = getNaverPayServerConfig()
  const kakaoServer = getKakaoPayServerConfig()

  return {
    naver: { client: naverPublic.pgEnabled, server: naverServer.ready },
    kakao: { client: kakaoPublic.pgEnabled, server: kakaoServer.ready },
    anyClient: naverPublic.pgEnabled || kakaoPublic.pgEnabled,
    anyServer: naverServer.ready || kakaoServer.ready,
  }
}
