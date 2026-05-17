import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import SearchBar from '@/components/home/SearchBar'
import HomeProgramRichCard from '@/components/home/HomeProgramRichCard'
import HomeStatsBar from '@/components/home/HomeStatsBar'
import HeroIllustration from '@/components/home/HeroIllustration'
import HeroRobot from '@/components/home/HeroRobot'
import GeoSourceSummary from '@/components/geo/GeoSourceSummary'
import type { HomeStats } from '@/lib/home/stats'
import type { RecommendedProgram } from '@/lib/home/recommendations'
import { RefreshCw } from 'lucide-react'

export default function GuestHomeView({
  stats,
  programs,
}: {
  stats: HomeStats
  programs: RecommendedProgram[]
}) {
  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-b from-blue-50 via-blue-50/40 to-white px-4 pb-12 pt-12 md:pb-16 md:pt-16">
        <div className="container mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="text-center lg:text-left">
              <Badge variant="secondary" className="mb-4">
                실제 공공 데이터 기반 · LLM 생성 공고 없음
              </Badge>
              <h1 className="mb-3 text-3xl font-black tracking-tight text-gray-900 md:text-5xl">
                정책자금,
                <br className="hidden sm:block" />
                AI에게 물어보세요
              </h1>
              <p className="mb-6 text-base text-muted-foreground md:text-lg">
                전국 중앙·지자체·공공기관 지원사업을 쉽고 빠르게 찾아보세요.
              </p>

              <div className="mx-auto max-w-2xl lg:mx-0">
                <SearchBar size="large" useSavedProfileDefaults={false} />
              </div>

              <HomeStatsBar stats={stats} />

              <div className="mt-6 flex justify-center md:hidden">
                <HeroRobot className="h-36 w-32 opacity-95" />
              </div>
            </div>

            <div className="hidden md:block">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold md:text-2xl">AI가 추천하는 맞춤 지원사업</h2>
              <p className="text-sm text-muted-foreground">
                기업마당 · K-Startup · 중소벤처24 실제 공공 데이터
              </p>
            </div>
            <Link href="/search" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              전체 보기 →
            </Link>
          </div>

          {programs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 py-16 text-center">
              <RefreshCw className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">공고 데이터를 동기화 중입니다</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {programs.slice(0, 4).map((prog, i) => (
                <HomeProgramRichCard key={prog.id} program={prog} variant="guest" rankIndex={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-t bg-slate-50 px-4 py-8">
        <div className="container mx-auto max-w-3xl">
          <GeoSourceSummary variant="compact" />
        </div>
      </section>

      <section className="bg-blue-700 px-4 py-12 text-white">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="mb-3 text-2xl font-bold">3분 진단으로 맞춤 공고 받기</h2>
          <p className="mb-6 text-blue-100">회원가입 후 진단·검색·서류 생성까지 한 번에 이용하세요.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}>
              무료로 시작하기
            </Link>
            <Link
              href="/diagnosis"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'border-2 border-white bg-transparent text-white hover:bg-white/15 hover:text-white'
              )}
            >
              3분 진단 체험
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
