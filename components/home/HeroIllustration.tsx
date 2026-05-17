import GuestHeroScene from '@/components/home/GuestHeroScene'

/** 비로그인 히어로 우측 — 목업 안 A (로봇 + 관공서 + 말풍선) */
export default function HeroIllustration() {
  return (
    <div className="relative mx-auto flex w-full max-w-md items-center justify-center">
      <GuestHeroScene className="h-auto w-full max-h-[240px]" />
    </div>
  )
}
