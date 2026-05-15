export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">법적 고지</h1>
        <p className="text-sm text-gray-400 mb-8">최종 수정일: 2026년 5월 15일</p>

        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-5 mb-6">
          <p className="text-sm font-bold text-yellow-800 mb-1">⚠️ 중요 안내</p>
          <p className="text-sm text-yellow-700">본 서비스의 모든 결과물은 참고용 정보이며 법적 효력이 없습니다. 실제 지원사업 신청 전 반드시 원문 공고 및 주관기관을 통해 확인하세요.</p>
        </div>

        <div className="bg-white rounded-xl border p-8 space-y-6">
          <section>
            <h2 className="text-lg font-bold mb-3">데이터 정확성 면책</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              본 서비스의 공고 정보는 기업마당(bizinfo.go.kr), K-Startup(k-startup.go.kr) 등 공공 API에서 자동 수집됩니다.
              원본 데이터의 정확성·최신성은 각 제공 기관에 의존하며, 서비스 운영자는 데이터의 오류·누락·지연으로 인한 손해에 대해 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">AI 결과물 면책</h2>
            <ul className="list-disc pl-6 text-sm text-gray-700 space-y-2">
              <li><strong>자격 판정</strong>: 룰 기반 엔진의 참고 결과입니다. 최종 자격 여부는 주관기관이 결정합니다.</li>
              <li><strong>사업계획서 초안</strong>: AI 생성 초안으로 법적 효력이 없습니다. 반드시 수정 후 제출하세요.</li>
              <li><strong>심사 점수 예측</strong>: 공식 루브릭 기반 참고용 예측입니다. 실제 점수와 다를 수 있습니다.</li>
              <li><strong>서류 체크리스트</strong>: 표준 서류 DB 기반이며, 공고마다 요구 서류가 다를 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">투자·법률 자문 비해당</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              본 서비스는 금융투자, 법률, 세무, 회계 자문을 제공하지 않습니다.
              실제 사업 결정 전 관련 전문가(변호사, 세무사, 공인회계사 등)에게 자문을 구하시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">서비스 신청 결과 면책</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              서비스 이용 후 지원사업 신청 결과(선정·탈락·취소 등)에 대해 서비스 운영자는 어떠한 책임도 지지 않습니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
