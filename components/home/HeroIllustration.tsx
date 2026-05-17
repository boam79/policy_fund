import Image from 'next/image'

/** 비로그인 히어로 우측 일러스트 (목업 안 A) */
export default function HeroIllustration() {
  return (
    <div className="relative mx-auto flex max-w-sm items-center justify-center lg:max-w-none">
      <div className="absolute -inset-4 rounded-full bg-blue-200/40 blur-2xl" aria-hidden />
      <div className="relative rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-8 shadow-lg">
        <Image
          src="/jiwondungji-logo-mark.png"
          alt=""
          width={160}
          height={160}
          className="mx-auto drop-shadow-md"
          priority
        />
        <p className="mt-4 text-center text-sm font-medium text-blue-800">
          AI가 공공 데이터에서
          <br />
          맞는 지원사업을 찾아드립니다
        </p>
      </div>
    </div>
  )
}
