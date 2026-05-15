import Link from 'next/link'
import JsonLd from '@/components/seo/JsonLd'
import GeoSourceSummary from '@/components/geo/GeoSourceSummary'
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site-config'

const steps = [
  { num: '01', title: '공고 검색', desc: '자연어 또는 조건 필터로 맞춤 지원사업을 검색합니다.', href: '/search', cta: '검색하기' },
  { num: '02', title: '자격 확인', desc: '공고를 선택하면 룰 기반으로 자격 가능성을 즉시 확인할 수 있습니다.', href: '/search', cta: '공고 찾기' },
  { num: '03', title: '서류 준비', desc: '서류 체크리스트와 마감일 역산 타임라인으로 준비 일정을 잡으세요.', href: '/documents/plan', cta: '준비하기' },
  { num: '04', title: '계획서 작성', desc: 'gov(공문서) 또는 PSST(창업패키지) 템플릿으로 초안을 자동 생성합니다.', href: '/documents/plan', cta: '초안 생성' },
  { num: '05', title: '점수 예측', desc: 'PSST 공식 배점 기반 품질 측정으로 제출 전 완성도를 확인하세요.', href: '/evaluate', cta: '점수 예측' },
]

const faqs = [
  { q: '정말 실제 공고 데이터인가요?', a: '기업마당(bizinfo.go.kr), K-Startup, 중소벤처24 공공 API에서 매일 자동 수집합니다. LLM이 생성한 가상 데이터는 없습니다.' },
  { q: 'AI가 자격을 직접 판단하나요?', a: '아닙니다. 자격 가능성은 세금 체납·지역·업종·업력·기업규모 5가지 룰 엔진이 결정합니다. AI는 결과 설명 문구만 보완합니다.' },
  { q: '사업계획서 초안을 그대로 제출해도 되나요?', a: '초안은 참고용입니다. 반드시 실제 공고 양식에 맞게 수정하고 전문가 검토 후 제출하세요.' },
  { q: '데이터는 얼마나 자주 업데이트되나요?', a: '매일 오전 9시 공공 API에서 최신 공고를 수집합니다. 공고 마감일이 지난 건은 자동으로 \'마감\'으로 변경됩니다.' },
]

export default function GuidePage() {
  const base = getSiteUrl()
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${SITE_NAME} 이용안내`,
    description: SITE_DESCRIPTION,
    url: `${base}/guide`,
    inLanguage: 'ko-KR',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: base },
  }

  const guideFaqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <JsonLd data={webPage} />
      <JsonLd data={guideFaqSchema} />
      <section className="border-b bg-white py-12">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h1 className="mb-3 text-3xl font-bold text-gray-900">이용안내</h1>
          <p className="text-gray-500">{SITE_NAME}를 5단계로 활용하는 방법</p>
          <div className="mx-auto mt-6 max-w-3xl text-left">
            <GeoSourceSummary variant="compact" />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="space-y-4">
            {steps.map((s, i) => (
              <div key={i} className="bg-white rounded-xl border p-5 flex gap-4 items-start">
                <div className="text-3xl font-black text-blue-100 w-10 flex-shrink-0">{s.num}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-600">{s.desc}</p>
                </div>
                <Link href={s.href} className="flex-shrink-0 text-sm text-blue-600 hover:underline font-medium">{s.cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-6">자주 묻는 질문</h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <div key={i} className="border rounded-lg p-4">
                <p className="font-medium text-gray-900 mb-2">Q. {f.q}</p>
                <p className="text-sm text-gray-600">A. {f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 bg-blue-600 text-white">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-xl font-bold mb-3">지금 바로 시작하세요</h2>
          <Link href="/search" className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors">지원사업 검색하기</Link>
        </div>
      </section>
    </div>
  )
}
