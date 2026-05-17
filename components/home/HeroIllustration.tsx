import Image from 'next/image'

/** 목업 원본 일러스트 (598×424) — SVG 대신 목업 PNG 사용 */
export default function HeroIllustration() {
  return (
    <div className="relative w-full max-w-[480px]">
      <Image
        src="/images/guest-hero-mockup.png"
        alt="지원둥지 AI 검색 도우미"
        width={598}
        height={424}
        className="h-auto w-full object-contain"
        priority
      />
    </div>
  )
}
