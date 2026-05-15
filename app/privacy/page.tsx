export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
        <p className="text-sm text-gray-400 mb-8">최종 수정일: 2026년 5월 15일</p>
        <div className="bg-white rounded-xl border p-8">
          <section className="mb-6">
            <h2 className="text-lg font-bold mb-3">1. 수집하는 개인정보 항목</h2>
            <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
              <li>회원가입 시: 이메일, 비밀번호(암호화)</li>
              <li>서비스 이용 시: 기업명, 업종, 지역, 직원 수 등 입력 정보 (선택)</li>
              <li>자동 수집: 접속 IP, 브라우저 정보, 서비스 이용 기록</li>
              <li>문의 접수 시: 이름, 이메일, 문의 내용</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold mb-3">2. 개인정보 수집 목적</h2>
            <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
              <li>맞춤 지원사업 검색 및 자격 판정 서비스 제공</li>
              <li>서비스 개선 및 통계 분석</li>
              <li>고객 문의 응대</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold mb-3">3. 개인정보 보유 기간</h2>
            <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
              <li>회원 정보: 회원 탈퇴 후 즉시 삭제 (단, 법령에 따라 보관 필요한 경우 해당 기간 보관)</li>
              <li>문의 내용: 처리 완료 후 1년 보관</li>
              <li>서비스 이용 기록: 1년 보관</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold mb-3">4. 제3자 제공</h2>
            <p className="text-sm text-gray-700">원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 의하거나 이용자의 동의가 있는 경우 예외입니다.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold mb-3">5. 개인정보 보호 조치</h2>
            <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
              <li>비밀번호 암호화 저장 (Supabase Auth bcrypt)</li>
              <li>HTTPS 전송 암호화</li>
              <li>Row Level Security(RLS)로 본인 데이터만 접근 가능</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">6. 이용자 권리</h2>
            <p className="text-sm text-gray-700">이용자는 언제든지 본인의 개인정보에 대한 열람, 수정, 삭제, 처리 정지를 요청할 수 있습니다. 고객센터(/contact)로 문의해 주세요.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
