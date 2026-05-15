import { Shield, Zap, Database, Search, FileText, BarChart2 } from 'lucide-react'

const features = [
  { icon: Search, title: '실제 공고 검색', desc: '기업마당·K-Startup·중소벤처24 실제 공고 데이터 기반 검색. LLM 생성 가상 데이터 없음.' },
  { icon: Shield, title: '룰 기반 자격판정', desc: '세금 체납·지역·업종·업력·기업규모 5가지 룰 엔진으로 자격 가능성 판단. AI가 결과를 임의로 바꾸지 않음.' },
  { icon: FileText, title: '서류·계획서 생성', desc: '표준 서류 DB 15종 체크리스트, 마감일 역산 타임라인, gov/PSST 2가지 사업계획서 초안 자동 생성.' },
  { icon: BarChart2, title: '심사 점수 예측', desc: '예비창업패키지 공식 PSST 배점(30/30/20/20) 기반 품질 측정 및 루브릭 점수 예측.' },
  { icon: Zap, title: '자연어 검색', desc: '\'서울 IT업체 직원 10명, 세금 없음\'처럼 자연어로 입력하면 조건 자동 추출 후 맞춤 공고 제시.' },
  { icon: Database, title: '서버 전용 보안', desc: '모든 API 키·LLM 호출은 Next.js 서버에서만 처리. 브라우저에 민감 정보 미노출.' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-20">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <div className="inline-block bg-white/20 text-white text-sm font-medium px-3 py-1 rounded-full mb-4">PolicyFund AI v2</div>
          <h1 className="text-4xl font-bold mb-4">정부지원사업 AI 매칭 서비스</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            실제 공공 API 기반 공고 데이터로 내 기업에 맞는 지원사업을 찾고,
            신청 서류부터 사업계획서까지 한 번에 준비하세요.
          </p>
        </div>
      </section>

      {/* 기존 문제 */}
      <section className="py-16 bg-white">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">기존 서비스의 한계를 해결합니다</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ['❌ 기존', '가상 공고 데이터로 실제 신청 불가', 'bg-red-50 border-red-200'],
              ['❌ 기존', 'API 키 프론트 노출 — 보안 취약', 'bg-red-50 border-red-200'],
              ['✅ PolicyFund', '기업마당·K-Startup 실제 공고 연동', 'bg-green-50 border-green-200'],
              ['✅ PolicyFund', '모든 API 키 서버에서만 처리', 'bg-green-50 border-green-200'],
            ].map(([tag, text, bg], i) => (
              <div key={i} className={`rounded-lg border p-4 ${bg}`}>
                <span className="text-xs font-bold">{tag}</span>
                <p className="text-sm text-gray-700 mt-1">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 핵심 기능 */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">핵심 기능</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl border p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg"><Icon className="h-5 w-5 text-blue-600" /></div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 운영 원칙 */}
      <section className="py-16 bg-white">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">운영 원칙</h2>
          <div className="space-y-3 max-w-2xl mx-auto">
            {[
              ['🔒 LLM 역할 제한', 'AI는 조건 추출·설명 보완·초안 작성에만 사용합니다. 공고 생성·자격 결정은 하지 않습니다.'],
              ['📋 실제 데이터', '홈 추천 배너는 반드시 실제 공공 데이터 기반입니다. AI 생성 공고 샘플은 사용하지 않습니다.'],
              ['⚠️ 법적 고지', '모든 결과 화면에 참고용 고지 문구를 표시합니다. 최종 판단은 반드시 직접 확인하세요.'],
              ['🔄 정기 동기화', '매일 오전 9시 공공 API에서 최신 공고를 수집·저장합니다.'],
            ].map(([title, desc]) => (
              <div key={title as string} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                <span className="text-lg">{(title as string).slice(0, 2)}</span>
                <div><p className="text-sm font-medium text-gray-900">{(title as string).slice(2)}</p><p className="text-xs text-gray-500 mt-0.5">{desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
