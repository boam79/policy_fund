import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { FileText, CheckCircle, TrendingUp, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import SearchBar from '@/components/home/SearchBar'

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

      {/* AI 추천 지원사업 배너 */}
      <section className="bg-white px-4 py-12">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">AI 추천 지원사업</h2>
              <p className="text-sm text-muted-foreground">
                실제 공공 데이터와 조건 매칭 결과를 기반으로 추천합니다.
              </p>
            </div>
            <Link href="/search" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              더보기 →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="default" className="shrink-0 text-xs">신청 가능</Badge>
                    <span className="text-xs text-muted-foreground">D-{10 + i}</span>
                  </div>
                  <CardTitle className="mt-2 text-base">공고 데이터 동기화 준비 중</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    공공 API 연동 후 실제 공고 데이터가 표시됩니다.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'flex-1 text-xs')} disabled>
                      자세히 보기
                    </button>
                    <button className={cn(buttonVariants({ size: 'sm' }), 'flex-1 text-xs')} disabled>
                      자격판정
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
