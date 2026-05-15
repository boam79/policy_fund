export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">환불정책</h1>
        <p className="text-sm text-gray-400 mb-8">최종 수정일: 2026년 5월 15일</p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <p className="text-sm text-blue-800">현재 서비스는 베타 운영 중으로 유료 결제가 없습니다. 추후 구독 플랜 도입 시 아래 정책이 적용됩니다.</p>
        </div>

        <div className="bg-white rounded-xl border p-8 space-y-6">
          <section>
            <h2 className="text-lg font-bold mb-3">구독 취소 및 환불</h2>
            <ul className="list-disc pl-6 text-sm text-gray-700 space-y-2">
              <li>구독 시작 후 7일 이내 미사용 시 전액 환불 가능</li>
              <li>사용 이력이 있는 경우 잔여 기간에 비례한 부분 환불</li>
              <li>연간 구독은 구독 시작 후 30일 이내 환불 가능 (사용량에 비례 차감)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">환불 불가 사항</h2>
            <ul className="list-disc pl-6 text-sm text-gray-700 space-y-2">
              <li>이용약관 위반으로 인한 이용 제한</li>
              <li>이용자 귀책 사유로 인한 서비스 이용 불가</li>
              <li>환불 신청 기간 초과</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">환불 신청 방법</h2>
            <p className="text-sm text-gray-700">고객센터(/contact)를 통해 환불 신청할 수 있습니다. 처리 기간은 영업일 기준 5~7일입니다.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
