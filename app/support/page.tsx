import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, Coffee, ArrowLeft } from 'lucide-react'
import { OpenInTossButton } from '@/components/support/OpenInTossButton'
import { SITE_NAME, DONATE_QR_IMAGE_PATH } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '후원하기',
  description: `${SITE_NAME} 운영을 응원해 주세요. 베타 기간에는 로그인 회원에게 서비스를 무료로 제공하고 있습니다.`,
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/80 via-white to-gray-50">
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          홈으로
        </Link>

        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <Heart className="h-8 w-8 fill-current" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">후원하기</h1>
          <p className="text-gray-600 leading-relaxed max-w-lg mx-auto">
            {SITE_NAME}는 정부지원사업 검색·자격 확인·문서 초안을 돕는 서비스입니다.
            <br />
            지금은 <strong className="text-gray-800">베타</strong>로 로그인 회원에게 무료로 제공하고 있어요.
            서비스가 도움이 되셨다면 운영비·서버·API 비용을 위해 응원해 주시면 큰 힘이 됩니다.
          </p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-white p-8 shadow-sm text-center space-y-6">
          <div className="flex items-center justify-center gap-2 text-rose-700">
            <Coffee className="h-5 w-5" />
            <p className="text-sm font-medium">토스로 후원하기</p>
          </div>

          <div className="mx-auto w-fit rounded-2xl border border-gray-100 bg-white p-4 shadow-inner">
            <Image
              src={DONATE_QR_IMAGE_PATH}
              alt="지원둥지 토스 후원 QR 코드"
              width={220}
              height={220}
              className="h-[220px] w-[220px] object-contain"
              priority
              unoptimized
            />
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            토스 앱 <strong className="text-gray-800">전체 → 사진으로 송금</strong>에서 위 QR을
            스캔하거나, 모바일에서 아래 버튼으로 송금 화면을 열어 주세요.
          </p>

          <OpenInTossButton className="w-full sm:w-auto min-w-[200px]" />

          <p className="text-xs text-gray-500 leading-relaxed">
            예전 <strong className="text-gray-600">toss.me(토스아이디 송금)</strong> 링크는 2024년 8월
            1일 종료되었습니다. 이 QR은 토스 앱 계좌 송금용입니다.
          </p>
        </div>

        <ul className="mt-10 space-y-3 text-sm text-gray-600">
          <li className="flex gap-2">
            <span className="text-rose-500 font-bold">·</span>
            후원은 선택 사항이며, 후원 여부와 관계없이 서비스 이용에 차등을 두지 않습니다.
          </li>
          <li className="flex gap-2">
            <span className="text-rose-500 font-bold">·</span>
            후원금은 서버·공공 API·AI API 등 운영 비용에 사용됩니다.
          </li>
          <li className="flex gap-2">
            <span className="text-rose-500 font-bold">·</span>
            토스 앱이 설치되어 있어야 QR·링크로 송금할 수 있습니다.
          </li>
          <li className="flex gap-2">
            <span className="text-rose-500 font-bold">·</span>
            세금계산서·영수증이 필요하시면{' '}
            <Link href="/contact?type=partnership" className="text-rose-600 underline">
              고객센터
            </Link>
            로 연락해 주세요.
          </li>
        </ul>
      </div>
    </div>
  )
}
