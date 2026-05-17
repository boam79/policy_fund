import HeroRobot from '@/components/home/HeroRobot'

/** 비로그인 히어로 우측 일러스트 (목업 안 A — 귀여운 AI 로봇) */
export default function HeroIllustration() {
  return (
    <div className="relative mx-auto flex max-w-sm items-center justify-center lg:max-w-none">
      <div className="absolute -inset-6 rounded-full bg-blue-200/50 blur-3xl" aria-hidden />
      <div className="relative rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50/80 px-6 py-8 shadow-lg">
        <HeroRobot className="mx-auto h-[200px] w-[180px] drop-shadow-sm md:h-[220px] md:w-[200px]" />
        <p className="mt-2 text-center text-sm font-medium text-blue-800">
          AI가 공공 데이터에서
          <br />
          맞는 지원사업을 찾아드립니다
        </p>
      </div>
    </div>
  )
}
