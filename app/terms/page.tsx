export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">이용약관</h1>
        <p className="text-sm text-gray-400 mb-8">최종 수정일: 2026년 5월 15일</p>
        <div className="bg-white rounded-xl border p-8 prose prose-sm max-w-none">
          <h2 className="text-lg font-bold mb-3">제1조 (목적)</h2>
          <p className="text-gray-700 mb-6">이 약관은 PolicyFund AI(이하 &ldquo;서비스&rdquo;)의 이용 조건 및 절차, 서비스 제공자와 이용자 간의 권리·의무·책임 사항을 규정함을 목적으로 합니다.</p>

          <h2 className="text-lg font-bold mb-3">제2조 (서비스 내용)</h2>
          <p className="text-gray-700 mb-4">서비스는 다음을 제공합니다.</p>
          <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-1">
            <li>정부·공공기관 지원사업 공고 검색 및 조건 매칭</li>
            <li>룰 기반 자격 가능성 참고 정보 제공</li>
            <li>서류 체크리스트·타임라인·사업계획서 초안 생성 (참고용)</li>
            <li>심사 점수 예측 (참고용)</li>
          </ul>

          <h2 className="text-lg font-bold mb-3">제3조 (면책 사항)</h2>
          <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-1">
            <li>서비스가 제공하는 모든 결과는 참고용이며 법적 효력이 없습니다.</li>
            <li>자격 판정·심사 점수는 AI 보조 도구의 예측일 뿐, 최종 판단은 주관기관이 합니다.</li>
            <li>공공 API 데이터의 정확성·최신성은 원본 제공 기관에 의존하며, 서비스는 이에 대한 책임을 지지 않습니다.</li>
            <li>서비스 이용으로 발생한 신청 결과에 대해 서비스는 책임을 지지 않습니다.</li>
          </ul>

          <h2 className="text-lg font-bold mb-3">제4조 (이용자 의무)</h2>
          <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-1">
            <li>이용자는 허위 정보를 입력하지 않아야 합니다.</li>
            <li>서비스를 통해 생성된 문서를 상업적 목적으로 재판매할 수 없습니다.</li>
            <li>서비스의 자동화된 접근(크롤링, API 대량 호출 등)을 허가 없이 수행할 수 없습니다.</li>
          </ul>

          <h2 className="text-lg font-bold mb-3">제5조 (서비스 변경·중단)</h2>
          <p className="text-gray-700 mb-6">서비스는 운영상·기술상 필요에 따라 사전 고지 후 서비스 내용을 변경하거나 중단할 수 있습니다.</p>

          <h2 className="text-lg font-bold mb-3">제6조 (준거법)</h2>
          <p className="text-gray-700">이 약관은 대한민국 법률에 따라 해석되며, 분쟁 발생 시 관할 법원은 서울중앙지방법원으로 합니다.</p>
        </div>
      </div>
    </div>
  )
}
