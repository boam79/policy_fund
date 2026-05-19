'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buildSubscriptionProductItems } from '@/lib/billing/naverpay'
import { SITE_NAME } from '@/lib/site-config'
import type { PlanId } from '@/lib/billing/plans'

type LoadingProvider = 'naver' | 'kakao' | null

export function usePaymentConfirm(planId: PlanId, planName: string, planPrice: number) {
  const router = useRouter()
  const [loading, setLoading] = useState<LoadingProvider>(null)
  const [error, setError] = useState('')

  const handleNaverPayment = useCallback(
    async (userId: string, config: { clientId: string; chainId: string; mode: string }) => {
      if (!userId) return
      if (!window.Naver?.Pay) {
        setError('네이버페이 결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.')
        return
      }

      setLoading('naver')
      setError('')

      try {
        const readyRes = await fetch('/api/billing/naver/ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId }),
        })
        const readyData = (await readyRes.json().catch(() => ({}))) as {
          orderId?: string
          error?: string
        }
        if (!readyRes.ok || !readyData.orderId) {
          setError(readyData.error ?? '결제 준비에 실패했습니다.')
          setLoading(null)
          return
        }

        const orderId = readyData.orderId
        const orderName = `${SITE_NAME} ${planName} 월 구독`
        const returnUrl = `${window.location.origin}/billing/success?plan=${planId}&merchantPayKey=${encodeURIComponent(orderId)}&amount=${planPrice}`

        const oPay = window.Naver.Pay.create({
          mode: config.mode as 'development' | 'production',
          clientId: config.clientId,
          chainId: config.chainId,
          payType: 'normal',
          openType: 'page',
        })

        oPay.open({
          merchantPayKey: orderId,
          merchantUserKey: userId,
          productName: orderName,
          totalPayAmount: planPrice,
          taxScopeAmount: planPrice,
          taxExScopeAmount: 0,
          productCount: 1,
          returnUrl,
          productItems: buildSubscriptionProductItems(planId, orderName),
        })
      } catch {
        setError('결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
        setLoading(null)
      }
    },
    [planId, planName, planPrice]
  )

  const handleKakaoPayment = useCallback(async () => {
    setLoading('kakao')
    setError('')

    try {
      const res = await fetch('/api/billing/kakao/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        redirectUrl?: string
        error?: string
      }

      if (!res.ok || !data.redirectUrl) {
        setError(data.error ?? '카카오페이 결제 준비에 실패했습니다.')
        setLoading(null)
        return
      }

      window.location.href = data.redirectUrl
    } catch {
      setError('결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(null)
    }
  }, [planId])

  return { loading, error, setError, handleNaverPayment, handleKakaoPayment, router }
}

declare global {
  interface Window {
    Naver?: {
      Pay?: {
        create: (opts: Record<string, string>) => {
          open: (opts: Record<string, unknown>) => void
        }
      }
    }
  }
}
