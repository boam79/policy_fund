'use client'

import { Loader2, CreditCard } from 'lucide-react'

type Props = {
  planPrice: number
  loading: 'naver' | 'kakao' | null
  userId: string
  naverEnabled: boolean
  kakaoEnabled: boolean
  sdkReady: boolean
  onNaver: () => void
  onKakao: () => void
}

export default function PaymentMethodButtons({
  planPrice,
  loading,
  userId,
  naverEnabled,
  kakaoEnabled,
  sdkReady,
  onNaver,
  onKakao,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {naverEnabled && (
        <button
          type="button"
          onClick={onNaver}
          disabled={loading !== null || !userId || !sdkReady}
          className="w-full py-3.5 bg-[#03C75A] text-white rounded-xl font-bold hover:bg-[#02b351] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading === 'naver' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {loading === 'naver'
            ? '결제 처리 중...'
            : sdkReady
              ? `네이버페이 ${planPrice.toLocaleString()}원`
              : '네이버페이 로딩 중...'}
        </button>
      )}

      {kakaoEnabled && (
        <button
          type="button"
          onClick={onKakao}
          disabled={loading !== null || !userId}
          className="w-full py-3.5 bg-[#FEE500] text-gray-900 rounded-xl font-bold hover:bg-[#f5dc00] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading === 'kakao' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {loading === 'kakao'
            ? '결제 준비 중...'
            : `카카오페이 ${planPrice.toLocaleString()}원`}
        </button>
      )}

      {!naverEnabled && !kakaoEnabled && (
        <button
          type="button"
          disabled
          className="w-full py-3.5 bg-gray-200 text-gray-500 rounded-xl font-bold cursor-not-allowed"
        >
          PG 연동 준비중
        </button>
      )}
    </div>
  )
}
