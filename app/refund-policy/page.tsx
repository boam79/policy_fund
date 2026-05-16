import Link from 'next/link'
import { SITE_NAME } from '@/lib/site-config'

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">환불정책</h1>
        <p className="text-sm text-gray-400 mb-8">최종 수정일: 2026년 5월 16일</p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <p className="text-sm text-blue-800">
            결제·취소·환불의 <strong>기술적 처리</strong>는 토스페이먼츠 등 결제대행사(PG)의 API 및 정책에
            따릅니다(전액·부분 취소 등). 본 정책은 「전자상거래 등에서의 소비자보호에 관한 법률」상 청약철회 등
            원칙을 반영하되, <strong>디지털 콘텐츠·구독 서비스</strong>의 특성에 따라 법령이 허용하는 범위에서
            제한될 수 있습니다.
          </p>
        </div>

        <div className="bg-white rounded-xl border p-8 space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. 적용 범위</h2>
            <p>
              본 환불정책은 {SITE_NAME}에서 제공하는 <strong>유료 구독·일회성 결제</strong>에 적용됩니다. 무료
              이용 구간에는 본 정책의 환불 절차가 적용되지 않습니다. 결제 수단별(카드·간편결제 등) 환불 소요
              기간은 PG 및 금융기관 정책에 따를 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. 청약철회(전자상거래법)</h2>
            <p className="mb-2">
              「전자상거래 등에서의 소비자보호에 관한 법률」에 따라, 구매 확정 전 단계에서 법정 철회 사유가
              인정되는 경우 청약철회를 요청할 수 있습니다. 다만 다음에 해당하는 경우 법령에 따라 청약철회가
              제한될 수 있습니다.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>디지털 콘텐츠:</strong> 계약 내용에 대한 제공이 개시된 후에는 소비자의 동의 없이 청약철회
                등이 제한될 수 있습니다(법 제17조 제2항 제5호 등).
              </li>
              <li>이미 사용된 이용권·기능(진단·문서 생성·평가 등)에 상응하는 가치가 소비된 부분</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. 구독 취소 및 환불 원칙</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>미사용 기간:</strong> 결제 직후 일정 기간 내 유료 기능을 사용하지 않은 경우 등, 서비스가
                별도로 안내하는 조건에 따라 전액 또는 일부 환불을 검토할 수 있습니다.
              </li>
              <li>
                <strong>사용 이력이 있는 경우:</strong> 잔여 기간·잔여 이용 횟수 등에 비례한 부분 환불 또는
                환불 불가가 적용될 수 있습니다.
              </li>
              <li>
                <strong>연간·장기 플랜:</strong> 구독 시작일부터 서비스가 정한 기간 이내 철회 요청 시, 이미
                제공된 기간·사용량을 공제한 잔액 환불 등의 방식을 적용할 수 있습니다.
              </li>
              <li>
                실제 환불 금액 확정 후 PG를 통한 <strong>결제 취소(전액/부분)</strong>가 이루어지며, 카드
                결제의 경우 카드사·PG 정책에 따라 매입 전 취소 또는 환급까지 수일이 소요될 수 있습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. 환불이 제한되거나 거절될 수 있는 경우</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>이용약관 위반으로 이용이 정지·해지된 경우</li>
              <li>이용자 귀책(계정 공유, 부정 사용 등)으로 서비스를 정상 이용할 수 없게 된 경우</li>
              <li>환불 신청 가능 기간·절차를 준수하지 않은 경우</li>
              <li>무료 체험·프로모션 조건에 따라 환불 대상에서 제외된 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. 환불 신청 방법</h2>
            <p>
              로그인 후 <strong>마이페이지의 결제 관리</strong> 등 서비스에 제공되는 화면에서 신청하거나, 서비스
              하단 <strong>고객지원</strong> 메뉴에 안내된 절차에 따라 접수해 주시기 바랍니다. 심사 후 PG 취소
              또는 환불 처리가 진행되며, 영업일 기준 약 5~14일 내외가 소요될 수 있습니다(결제 수단·PG 사정에
              따라 달라질 수 있음).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. 기타</h2>
            <p>
              본 정책과{' '}
              <Link href="/terms" className="text-blue-600 underline hover:text-blue-800">
                이용약관
              </Link>
              이 상충하는 경우 이용약관 및 개별 결제 화면의 고지를 우선할 수 있습니다. 문의는 서비스에 표시된
              고객지원 절차를 이용해 주시기 바랍니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
