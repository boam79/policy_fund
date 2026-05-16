import Link from 'next/link'
import { SITE_NAME } from '@/lib/site-config'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">이용약관</h1>
        <p className="text-sm text-gray-400 mb-8">최종 수정일: 2026년 5월 16일</p>
        <div className="bg-white rounded-xl border p-8 prose prose-sm max-w-none text-gray-700">
          <h2 className="text-lg font-bold mb-3 text-gray-900">제1조 (목적)</h2>
          <p className="mb-6">
            본 약관은 {SITE_NAME}(이하 &ldquo;서비스&rdquo;)가 제공하는 온라인 서비스의 이용 조건 및 절차, 서비스
            운영자와 이용자 간의 권리·의무·책임 사항을 규정함을 목적으로 합니다.
          </p>

          <h2 className="text-lg font-bold mb-3 text-gray-900">제2조 (약관의 효력 및 변경)</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
            <li>
              서비스는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 사전에 공지합니다.
              이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
            </li>
          </ul>

          <h2 className="text-lg font-bold mb-3 text-gray-900">제3조 (용어의 정의)</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>
              &ldquo;이용자&rdquo;란 본 약관에 따라 서비스에 접속하여 서비스를 이용하는 회원 및 비회원을 말합니다.
            </li>
            <li>&ldquo;회원&rdquo;이란 가입 절차를 완료하고 서비스를 이용하는 자를 말합니다.</li>
            <li>
              &ldquo;유료 서비스&rdquo;란 일정 대가를 지급하고 이용할 수 있는 구독·기능 패키지 등을 말합니다.
            </li>
          </ul>

          <h2 className="text-lg font-bold mb-3 text-gray-900">제4조 (서비스의 내용)</h2>
          <p className="mb-4">서비스는 다음 각 호의 기능을 제공할 수 있습니다.</p>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>정부·공공기관 지원사업 공고 검색 및 조건 매칭</li>
            <li>룰 기반 자격·조건 참고 정보 제공</li>
            <li>서류 체크리스트·타임라인·사업계획서 초안 생성(참고용)</li>
            <li>심사·품질 관련 참고 정보 제공(참고용)</li>
            <li>기타 서비스가 정하는 부가 기능</li>
          </ul>

          <h2 className="text-lg font-bold mb-3 text-gray-900">제5조 (이용계약의 성립)</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>이용계약은 이용자가 본 약관에 동의하고 회원가입 신청을 하며, 서비스가 이를 승낙함으로써 성립합니다.</li>
            <li>
              서비스는 허위 정보 기재, 타인 명의 도용, 부정 이용 우려 등이 있는 경우 승낙을 거절하거나 사후에
              이용계약을 해지할 수 있습니다.
            </li>
            <li>만 14세 미만 아동의 회원가입은 원칙적으로 허용하지 않습니다.</li>
          </ul>

          <h2 className="text-lg font-bold mb-3 text-gray-900">제6조 (회원정보의 변경·탈퇴)</h2>
          <p className="mb-6">
            회원은 언제든지 본인의 정보를 열람·수정할 수 있으며, 탈퇴를 요청할 수 있습니다. 탈퇴 후 일정 정보는
            관련 법령 및{' '}
            <Link href="/privacy" className="text-blue-600 underline">
              개인정보처리방침
            </Link>
            에 따라 보관될 수 있습니다.
          </p>

          <h2 className="text-lg font-bold mb-3 text-gray-900">제7조 (유료 서비스 및 결제)</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>
              유료 서비스의 내용·요금·이용 조건은 서비스 내 안내 페이지에 따릅니다. 결제는 토스페이먼츠 등
              제휴 결제대행사(PG)를 통해 이루어질 수 있으며, PG 약관이 일부 적용될 수 있습니다.
            </li>
            <li>
              청약철회·환불은 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령 및 서비스 내 별도
              환불 정책(있는 경우)에 따릅니다. 디지털 콘텐츠의 특성상 이미 제공이 개시된 부분에 대해서는 법령이
              허용하는 범위에서 청약철회가 제한될 수 있습니다.
            </li>
            <li>이용자는 결제 정보를 타인에게 누설하지 않아야 하며, 부정 사용에 대한 책임은 이용자에게 있습니다.</li>
          </ul>

          <h2 className="text-lg font-bold mb-3 text-gray-900">제8조 (AI·데이터·면책)</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>
              서비스가 제공하는 검색·진단·문서 초안·점수 예측 등 모든 결과는 참고용이며, 법적·행정적 효력이나
              주관기관의 최종 판단을 대체하지 않습니다.
            </li>
            <li>
              자격·조건 판단의 핵심 로직은 서비스가 정한 규칙에 따르며, AI(생성형 모델)는 설명 보완·자연어
              처리·초안 작성 등 보조 목적으로만 사용될 수 있습니다.
            </li>
            <li>
              공공 API·공고 원문 데이터의 정확성·최신성·완전성은 각 제공 기관에 의존하며, 서비스는 이를 보증하지
              않습니다.
            </li>
            <li>
              서비스 이용으로 인한 지원사업 신청 결과·손실·분쟁에 대해 서비스는 고의 또는 중대한 과실이 없는 한
              책임을 지지 않습니다.
            </li>
          </ul>

          <h2 className="text-lg font-bold mb-3 text-gray-900">제9조 (이용자의 의무)</h2>
          <ul className="list-disc pl-6 mb-6 space-y-1">
            <li>이용자는 관련 법령, 본 약관, 서비스 공지를 준수하여야 합니다.</li>
            <li>허위·도용 정보를 입력해서는 안 됩니다.</li>
            <li>서비스를 통해 생성된 결과물을 무단으로 제3자에게 판매·재배포하거나 서비스를 방해하는 행위를 해서는 안 됩니다.</li>
            <li>자동화된 수집(크롤링, 무단 API 대량 호출 등)을 서비스의 사전 서면 동의 없이 수행해서는 안 됩니다.</li>
          </ul>

          <h2 className="text-lg font-bold mb-3 text-gray-900">제10조 (저작권 및 지식재산)</h2>
          <p className="mb-6">
            서비스의 UI, 로고, 소프트웨어, 데이터베이스 구축물에 관한 권리는 서비스 또는 정당한 권리자에게
            귀속됩니다. 이용자가 입력한 데이터에 대한 권리는 이용자에게 있으나, 서비스 운영·개선을 위해 필요한
            범위에서 비독점적 이용·저장·가공 라이선스를 부여하는 것에 동의한 것으로 봅니다(법령이 허용하는 범위).
          </p>

          <h2 className="text-lg font-bold mb-3 text-gray-900">제11조 (서비스의 변경·중단)</h2>
          <p className="mb-6">
            서비스는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경·중단할 수 있으며, 이용자에게 불리하지
            않은 범위에서 사전 또는 사후 공지합니다. 천재지변, 시스템 장애, 제휴사 통신 두절 등 불가항력으로 인한
            중단에 대해서는 책임이 면제될 수 있습니다.
          </p>

          <h2 className="text-lg font-bold mb-3 text-gray-900">제12조 (개인정보보호)</h2>
          <p className="mb-6">
            서비스는 이용자의 개인정보를 보호하기 위해{' '}
            <Link href="/privacy" className="text-blue-600 underline">
              개인정보처리방침
            </Link>
            을 수립·운영합니다.
          </p>

          <h2 className="text-lg font-bold mb-3 text-gray-900">제13조 (준거법 및 관할)</h2>
          <p>
            본 약관은 대한민국 법률에 따르며, 서비스와 이용자 간 분쟁에 관한 소송은 민사소송법 등 관련 법령에
            따른 관할 법원에 제기합니다. 다만, 소비자분쟁 등 관련 법령에 따른 전속관할이 있는 경우에는 그에
            따릅니다.
          </p>
        </div>
      </div>
    </div>
  )
}
