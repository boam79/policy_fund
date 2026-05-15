import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { FileText, CheckCircle, TrendingUp, Search, RefreshCw, Clock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import SearchBar from '@/components/home/SearchBar'
import ProgramBannerCard from '@/components/home/ProgramBannerCard'
import type { RecommendedProgram } from '@/app/api/home/recommendations/route'
import type { Database } from '@/types/database.types'

export const revalidate = 1800 // 30분 ISR

async function fetchRecommendations(): Promise<RecommendedProgram[]> {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('support_programs')
      .select('id, source, title, organization, region, support_type, application_end_date, application_url, status, recommendation_score')
      .eq('visibility_status', 'visible')
      .in('status', ['active', 'closing_soon'])
      .gte('application_end_date', today)
      .not('application_url', 'is', null)
      .order('recommendation_score', { ascending: false })
      .order('application_end_date', { ascending: true })
      .limit(8)

    if (error || !data) return []

    const now = Date.now()
    return data.map((p) => ({
      id: p.id,
      source: p.source,
      title: p.title,
      organization: p.organization,
      region: p.region,
      support_type: p.support_type,
      application_end_date: p.application_end_date as string | null,
      application_url: p.application_url,
      status: p.status ?? 'active',
      days_left: p.application_end_date
        ? Math.ceil((new Date(p.application_end_date).getTime() - now) / 86400000)
        : null,
    }))
  } catch {
    return []
  }
}

async function RecommendationBanners() {
  const programs = await fetchRecommendations()

  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 py-16 text-center">
        <RefreshCw className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          공고 데이터를 동기화 중입니다
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          관리자가 공공 API 동기화를 실행하면 실제 공고가 표시됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {programs.map((prog) => (
        <ProgramBannerCard key={`${prog.source}:${prog.id}`} program={prog} />
      ))}
    </div>
  )
}

function BannerSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-44 rounded-xl border border-border/40 bg-muted/30 animate-pulse"
        />
      ))}
    </div>
  )
}

async function ClosingSoonList() {
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const today = new Date(now).toISOString().slice(0, 10)
  const sevenDays = new Date(now + 7 * 86400000).toISOString().slice(0, 10)

  let data: { id: string; title: string; organization: string | null; application_end_date: string | null }[] | null = null
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const result = await supabase
      .from('support_programs')
      .select('id,title,organization,application_end_date')
      .eq('visibility_status', 'visible')
      .gte('application_end_date', today)
      .lte('application_end_date', sevenDays)
      .order('application_end_date', { ascending: true })
      .limit(5)
    data = result.data
  } catch { return null }

  if (!data?.length) return <p className="text-sm text-gray-400">마감임박 공고가 없습니다.</p>
  return (
    <div className="space-y-2">
      {data.map(p => {
        const days = Math.ceil((new Date(p.application_end_date!).getTime() - now) / 86400000)
        return (
          <Link key={p.id} href={`/search/${p.id}`}
            className="flex items-center justify-between p-3 bg-white rounded-xl border hover:border-red-300 hover:shadow-sm transition-all group">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-red-600">{p.title}</p>
              <p className="text-xs text-gray-400">{p.organization}</p>
            </div>
            <span className={`text-xs font-bold ml-3 px-2 py-1 rounded-full flex-shrink-0 ${days === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
              D-{days}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

async function NewlyAddedList() {
  const today = new Date().toISOString().slice(0, 10)
  const SRC: Record<string, string> = { bizinfo: '기업마당', kstartup: 'K-Startup', smes24: '중소벤처24' }

  let data: { id: string; title: string; organization: string | null; application_end_date: string | null; source: string | null }[] | null = null
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const result = await supabase
      .from('support_programs')
      .select('id,title,organization,application_end_date,source')
      .eq('visibility_status', 'visible')
      .in('status', ['active', 'closing_soon'])
      .gte('application_end_date', today)
      .order('created_at', { ascending: false })
      .limit(5)
    data = result.data
  } catch { return null }

  if (!data?.length) return <p className="text-sm text-gray-400">신규 공고가 없습니다.</p>
  return (
    <div className="space-y-2">
      {data.map(p => (
        <Link key={p.id} href={`/search/${p.id}`}
          className="flex items-center justify-between p-3 bg-white rounded-xl border hover:border-blue-300 hover:shadow-sm transition-all group">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">{p.title}</p>
            <p className="text-xs text-gray-400">{p.organization}</p>
          </div>
          <span className="text-xs text-gray-400 ml-3 flex-shrink-0">{SRC[p.source ?? ''] ?? p.source}</span>
        </Link>
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 pb-16 pt-20">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">
            실제 공공 데이터 기반 · LLM 생성 공고 없음
          </Badge>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
            정책자금, AI에게 물어보세요
          </h1>
          <p className="mb-8 text-lg text-muted-foreground">
            AI 컨설턴트가 우리 회사에 맞는 정부지원사업을 찾아드립니다.
          </p>

          {/* 자연어 검색창 — Gemini AI 연동 */}
          <div className="mx-auto max-w-2xl">
            <SearchBar size="large" />
          </div>
        </div>
      </section>

      {/* 실제 공고 추천 배너 */}
      <section className="bg-white px-4 py-12">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">실제 공고 추천</h2>
              <p className="text-sm text-muted-foreground">
                기업마당 · K-Startup 실제 공공 데이터 기반
              </p>
            </div>
            <Link href="/search" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              전체 보기 →
            </Link>
          </div>

          <Suspense fallback={<BannerSkeleton />}>
            <RecommendationBanners />
          </Suspense>
        </div>
      </section>

      {/* 마감임박 / 신규 공고 트렌딩 */}
      <section className="bg-gray-50 px-4 py-10">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3">
                <Clock className="h-4 w-4 text-red-500" />마감 임박 공고
              </h3>
              <ClosingSoonList />
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3">
                <Sparkles className="h-4 w-4 text-blue-500" />신규 등록 공고
              </h3>
              <NewlyAddedList />
            </div>
          </div>
        </div>
      </section>

      {/* 4단계 이용 흐름 */}
      <section className="bg-gray-50 px-4 py-12">
        <div className="container mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-xl font-bold">PolicyFund AI 이용 프로세스</h2>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { icon: Search, step: '1', title: '질문 입력', desc: '자연어로 상황과 목적을 입력하세요.' },
              { icon: CheckCircle, step: '2', title: '조건 추출', desc: 'AI가 지역, 업종, 업력 등 조건을 추출합니다.' },
              { icon: TrendingUp, step: '3', title: '공고 매칭', desc: '실제 공공 데이터 기반 공고를 매칭합니다.' },
              { icon: FileText, step: '4', title: '서류/계획서 생성', desc: '서류체크리스트와 사업계획서 초안을 생성합니다.' },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <p className="mb-1 text-sm font-semibold">{step}. {title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-700 px-4 py-12 text-white">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="mb-3 text-2xl font-bold">지금 바로 PolicyFund AI v2를 시작해보세요</h2>
          <p className="mb-6 text-blue-100">
            AI가 당신의 상황에 맞는 정부지원사업을 찾아드립니다.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/signup" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}>
              무료로 시작하기
            </Link>
            <Link href="/search" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white text-white hover:bg-blue-600')}>
              지원사업 찾기
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
