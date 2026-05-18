import Link from 'next/link'
import { CheckCircle2, Info, RefreshCw } from 'lucide-react'
import SearchBar from '@/components/home/SearchBar'
import GuestProgramCard from '@/components/home/GuestProgramCard'
import HomeStatsBar from '@/components/home/HomeStatsBar'
import HeroIllustration from '@/components/home/HeroIllustration'
import Image from 'next/image'
import type { HomeStats } from '@/lib/home/stats'
import type { RecommendedProgram } from '@/lib/home/recommendations'
import { HOME_GUEST_PROGRAM_LIMIT } from '@/lib/home/program-display'

export default function GuestHomeView({
  stats,
  programs,
}: {
  stats: HomeStats
  programs: RecommendedProgram[]
}) {
  return (
    <div className="flex flex-col bg-white">
      <section className="bg-[#EFF6FF] px-4 pb-12 pt-8 md:pb-14 md:pt-10">
        <div className="container mx-auto max-w-7xl">
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
            <div>
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                실제 공공 데이터 기반
              </span>

              <h1 className="mb-3 text-[2rem] font-black leading-[1.15] tracking-tight text-gray-900 md:text-[2.75rem]">
                정책자금, AI에게 물어보세요
              </h1>
              <p className="mb-6 max-w-xl text-base text-slate-600 md:text-lg">
                전국의 정부·지자체·공공기관 지원사업을 쉽고 빠르게 찾아드립니다.
              </p>

              <SearchBar
                layout="hero"
                hideExamples
                useSavedProfileDefaults={false}
                placeholder="사업명, 키워드, 지원내용, 기관명 등을 검색해보세요"
              />

              <HomeStatsBar stats={stats} variant="guest" />

              <div className="mt-8 flex justify-center lg:hidden">
                <Image
                  src="/images/guest-hero-mockup.png"
                  alt=""
                  width={598}
                  height={424}
                  className="h-auto w-full max-w-[300px] object-contain"
                  priority
                />
              </div>
            </div>

            <div className="hidden items-center justify-center lg:flex">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-10 md:py-12">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-1.5 text-lg font-bold text-gray-900 md:text-xl">
              AI가 추천하는 맞춤 지원사업
              <Info className="h-4 w-4 text-slate-400" aria-hidden />
            </h2>
            <Link
              href="/search"
              className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              더보기 &gt;
            </Link>
          </div>

          {programs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 py-16 text-center">
              <RefreshCw className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">공고 데이터를 동기화 중입니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {programs.slice(0, HOME_GUEST_PROGRAM_LIMIT).map((prog, i) => (
                <GuestProgramCard key={prog.id} program={prog} rankIndex={i} compact />
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-2 border-t border-slate-100 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>AI 매칭 점수는 회원님의 관심사 및 기업정보를 기반으로 산출됩니다.</p>
            <Link href="/faq" className="shrink-0 font-medium text-blue-600 hover:underline">
              매칭 기준 자세히 보기 &gt;
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
