import Link from 'next/link'
import { SITE_NAME } from '@/lib/site-config'

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">면책 및 법적 고지</h1>
        <p className="text-sm text-gray-400 mb-8">최종 수정일: 2026년 5월 16일</p>

        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-5 mb-6">
          <p className="text-sm font-bold text-yellow-800 mb-1">중요 안내</p>
          <p className="text-sm text-yellow-700">
            {SITE_NAME}가 제공하는 검색·진단·문서 초안·점수 예측 등 모든 정보는 <strong>참고용</strong>이며,
            행정처분·소송·계약 등에 대한 <strong>법적·행정적 효력을 갖지 않습니다</strong>. 지원사업 신청·제출 전
            반드시 <strong>공고 원문</strong>과 <strong>주관기관</strong>을 통해 확인하시기 바랍니다.
          </p>
        </div>

        <div className="bg-white rounded-xl border p-8 space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. 서비스 성격 및 보증의 부인</h2>
            <p className="mb-2">
              본 서비스는 공공 데이터를 활용한 정보 제공·편의 기능을 제공할 뿐, 특정 지원사업의 적격·선정 가능성,
              심사 점수, 제출 서류의 완전성 등을 <strong>보증하지 않습니다</strong>. 서비스의 가용성·연속성·오류
              없음을 보장하지 않으며, 점검·장애·제3자 서비스(호스팅·PG·AI API 등) 사유로 일시 중단되거나 결과가
              지연·누락될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. 데이터 정확성·최신성</h2>
            <p>
              공고 정보는 기업마당(bizinfo.go.kr), K-Startup(k-startup.go.kr), 중소벤처24 등 <strong>공공 API</strong>
              를 통해 수집됩니다. 원본 데이터의 정확성·최신성·완전성은 각 제공 기관에 의존하며, 수집·가공 과정에서
              지연이나 표현 차이가 발생할 수 있습니다. 이로 인한 이용자의 결정·신청 결과에 대해 운영자는 고의 또는
              중대한 과실이 없는 한 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. AI·룰 엔진 결과에 대한 면책</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>자격·조건 참고 정보:</strong> 룰 기반 엔진과 보조적 AI 설명의 조합일 수 있으며, 최종
                자격·적격 여부는 주관기관이 결정합니다.
              </li>
              <li>
                <strong>사업계획서·문서 초안:</strong> 생성형 AI가 만든 초안으로, 제출 서류로 그대로 사용할 수
                없습니다. 반드시 사실 관계·수치·공고 요건에 맞게 수정·검증해야 합니다.
              </li>
              <li>
                <strong>심사·품질 관련 참고 정보:</strong> 내부 루브릭 등에 기반한 참고용이며, 실제 심사 점수·
                결과와 다를 수 있습니다.
              </li>
              <li>
                <strong>서류 체크리스트:</strong> 일반적 기준에 따른 목록일 수 있으며, 공고별 추가·예외 서류가
                있을 수 있습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. 투자·법률·세무 자문 비해당</h2>
            <p>
              본 서비스는 금융투자, 법률, 세무, 회계 자문을 제공하지 않습니다. 실제 사업·신청·계약 결정 전 관련
              전문가에게 자문을 구하시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. 신청·선정 결과에 대한 책임 한계</h2>
            <p>
              서비스 이용 후 지원사업 신청·선정·탈락·취소 등 어떠한 결과에 대해서도 운영자는 법령이 허용하는
              범위에서 책임을 부인합니다. 제3자와의 분쟁은 해당 당사자 간에 해결하는 것이 원칙입니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. 결제·유료 서비스</h2>
            <p>
              유료 기능이 제공되는 경우 결제는 토스페이먼츠 등 결제대행사(PG)를 통해 이루어질 수 있으며, 결제
              승인·취소·환불의 기술적 처리는 PG 정책 및 API(예: 결제 취소 요청)에 따릅니다. 청약철회·환불 조건은{' '}
              <Link href="/refund-policy" className="text-blue-600 underline hover:text-blue-800">
                환불정책
              </Link>
              및 <Link href="/terms" className="text-blue-600 underline hover:text-blue-800">이용약관</Link>을
              참고하시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. 관련 문서</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <Link href="/terms" className="text-blue-600 underline hover:text-blue-800">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-blue-600 underline hover:text-blue-800">
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
