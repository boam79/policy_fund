import { SITE_NAME } from '@/lib/site-config'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
        <p className="text-sm text-gray-400 mb-8">최종 수정일: 2026년 5월 16일</p>
        <div className="bg-white rounded-xl border p-8 space-y-8 text-sm text-gray-700">
          <section>
            <p>
              {SITE_NAME}(이하 &ldquo;서비스&rdquo;)는 「개인정보 보호법」 등 관련 법령을 준수하며, 정보주체의
              개인정보를 보호하고 권익을 보호하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다. 본 방침은
              서비스 화면에 게시하며, 법령·서비스 변경에 따라 개정될 수 있습니다. 중요한 변경 시 서비스 내
              공지 등 합리적인 방법으로 안내합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. 개인정보의 처리 목적</h2>
            <p className="mb-2">서비스는 수집한 개인정보를 다음의 목적 범위에서만 처리합니다.</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>회원 식별·가입 의사 확인, 본인 확인, 부정 이용 방지</li>
              <li>맞춤 지원사업 검색, 자격·조건 참고 정보 제공, 서류·타임라인·사업계획서 초안 등 부가 기능 제공</li>
              <li>유료 구독·결제·이용량 집계, 과금·환불·고지 등 결제 관련 처리</li>
              <li>서비스 품질 개선, 통계·로그 분석, 오류 진단, 보안 사고 대응</li>
              <li>문의·불만 처리, 공지·알림 전달(해당 기능을 제공하는 경우)</li>
              <li>관련 법령에 따른 의무 이행 및 분쟁 대응</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. 처리하는 개인정보의 항목 및 수집 방법</h2>
            <p className="mb-2 font-medium text-gray-900">(1) 회원가입·로그인</p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>필수: 이메일 주소, 비밀번호(서버에 저장 시 일방향 암호화 등으로 처리)</li>
              <li>소셜 로그인을 이용하는 경우: 해당 인증 제공자가 서비스에 전달하는 식별자·이메일 등(연동 설정에 따름)</li>
            </ul>
            <p className="mb-2 font-medium text-gray-900">(2) 서비스 이용 과정에서 이용자가 입력하는 정보</p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>기업명, 업종, 지역, 직원 수, 매출·설립연도 등 진단·검색·문서 초안에 필요한 사업자 관련 정보(입력 범위에 따름, 일부는 선택)</li>
              <li>공고명·공고 요지·마감일 등 문서 생성에 필요한 입력값</li>
            </ul>
            <p className="mb-2 font-medium text-gray-900">(3) 서비스 이용 과정에서 자동 생성·수집될 수 있는 정보</p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>접속 IP, 쿠키·세션·기기·브라우저 정보, 이용 시각, 이용 기록, 오류 로그</li>
              <li>이용량·기능 사용 이력(예: 진단·문서 생성·평가 횟수 등 요금제 운영 목적)</li>
            </ul>
            <p className="mb-2 font-medium text-gray-900">(4) 문의</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>이름(또는 닉네임), 이메일, 문의 내용, 첨부파일(있는 경우)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. 개인정보의 보유·이용 기간 및 파기</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="font-medium">회원 정보:</span> 회원 탈퇴 시 지체 없이 파기합니다. 다만, 관계
                법령에 따라 보존할 의무가 있는 경우 해당 법령에서 정한 기간 동안 별도 저장 후 파기합니다.
              </li>
              <li>
                <span className="font-medium">결제·계약·세금계산서 등 거래 관련 기록:</span> 「전자상거래 등에서의
                소비자보호에 관한 법률」 등 관련 법령에 따른 보관 기간을 준수합니다.
              </li>
              <li>
                <span className="font-medium">문의 기록:</span> 처리 완료 후 최대 3년 이내 보관 후 파기할 수
                있습니다(분쟁·통계 목적).
              </li>
              <li>
                <span className="font-medium">서비스 로그:</span> 보안·통계 목적 등으로 일정 기간 보관 후 파기할 수
                있습니다.
              </li>
            </ul>
            <p className="mt-3">
              파기는 복구가 불가능한 방법(전자적 파일 영구 삭제, 출력물 분쇄 등)으로 진행합니다. 법령에 따라
              보관 중인 정보는 법령이 허용하는 목적 외 다른 용도로 이용하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. 개인정보의 제3자 제공</h2>
            <p>
              서비스는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 다만, 정보주체의 동의가 있거나
              「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 제공할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. 개인정보 처리 위탁</h2>
            <p className="mb-3">
              서비스의 원활한 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁할 수 있습니다. 위탁업무의 내용이나
              수탁자가 변경되는 경우 본 방침을 개정하여 공개합니다.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="font-medium">클라우드 인프라·데이터베이스·인증(Supabase 등):</span> 회원·서비스
                데이터 저장, 인증, API 제공
              </li>
              <li>
                <span className="font-medium">웹 애플리케이션 호스팅(Vercel 등):</span> 애플리케이션 배포·트래픽 처리
              </li>
              <li>
                <span className="font-medium">결제 대행(토스페이먼츠 등):</span> 결제 승인·정산·부정 이용 방지(카드
                번호 등 결제 민감정보는 PG사 정책에 따라 PG가 직접 처리하는 범위에 한함)
              </li>
              <li>
                <span className="font-medium">생성형 AI API(Google Gemini 등):</span> 자연어 이해·설명 보완·문서
                초안 생성 등에 필요한 최소한의 텍스트 처리(서버에서 호출)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. 개인정보의 국외 이전</h2>
            <p>
              위탁·이용 목적을 위해 개인정보가 국외의 클라우드·AI·결제 인프라에서 처리될 수 있습니다. 이 경우
              「개인정보 보호법」 제28조의8 등에 따라 이전 국가, 이전 일시 및 방법, 제공받는 자의 연락처, 관리
              방법 등을 본 방침·별도 동의 또는 계약을 통해 필요한 범위에서 안내·조치합니다. 구체적 이전 내역은
              수탁자의 개인정보처리방침·DPA를 함께 참고해 주시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. 쿠키 등 자동 수집 장치</h2>
            <p>
              서비스는 로그인 유지·보안·서비스 개선을 위해 쿠키 또는 이와 유사한 기술을 사용할 수 있습니다. 브라우저
              설정에서 쿠키 저장을 거부할 수 있으나, 일부 기능이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. 정보주체의 권리·의무 및 행사 방법</h2>
            <p className="mb-2">
              정보주체는 언제든지 다음 각 권리를 행사할 수 있으며, 서비스는 지체 없이 조치합니다.
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>개인정보 열람·정정·삭제·처리 정지 요구</li>
              <li>동의 철회(회원 탈퇴 등)</li>
            </ul>
            <p>
              권리 행사는 로그인 후 제공되는 계정·마이페이지의 안내에 따르거나, 서비스 하단 등에 표시된 고객지원
              메뉴의 절차에 따라 요청해 주시기 바랍니다. 법정대리인 등 대리인을 통한 요청 시 위임장 등 확인 절차를
              둘 수 있습니다. 또한 「개인정보 보호법」 제35조의4에 따른 정보주체의 권리 제한 사유가 있는 경우
              요청이 거절될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. 자동화된 결정에 관한 사항</h2>
            <p>
              자격·조건 참고 정보 등 일부 기능은 규칙 기반 로직과 보조적 AI 설명이 결합될 수 있습니다. 법령상
              &ldquo;순수 자동화된 결정&rdquo;만으로 이용자에게 법적·중대한 영향을 주는 처리를 하지 않으며, 결과는
              참고용이며 최종 판단은 주관기관·이용자에게 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. 개인정보의 안전성 확보조치</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>비밀번호 등 중요 정보의 암호화 저장 및 전송 구간 HTTPS 적용</li>
              <li>데이터베이스 Row Level Security(RLS) 등 접근 통제로 본인 데이터 접근 제한(Supabase 권장 패턴)</li>
              <li>API 키·결제 비밀키 등은 서버 환경에서만 사용</li>
              <li>침해 사고 대비 로그·백업·최소 권한 원칙 운영</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">11. 개인정보 보호책임자 및 고충처리</h2>
            <p className="mb-2">
              개인정보 처리에 관한 문의, 불만, 피해 구제 신청은 서비스에 표시된 고객지원 절차에 따라 접수할 수
              있습니다. 서비스는 정보주체의 신속한 처리를 위해 노력합니다.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <span className="font-medium">기타:</span> 개인정보침해 신고·상담은 한국인터넷진흥원
                privacy.kisa.or.kr(국번 없이 118) 등에 문의하실 수 있습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">12. 고정형 영상정보처리기기</h2>
            <p>서비스는 고정형 영상정보처리기기를 운영하지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">13. 개인정보처리방침의 변경</h2>
            <p>
              본 방침의 내용 추가·삭제·수정이 있는 경우 개정 7일 전부터 공지합니다. 다만, 정보주체에게 불리한
              중요한 변경의 경우 최소 30일 전 공지하거나 별도의 동의를 받을 수 있습니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
