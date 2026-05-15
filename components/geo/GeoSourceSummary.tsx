import Link from 'next/link'

/**
 * GEO(생성형·답변 엔진 등) 참고용: 무엇·근거·한계를 한 블록에 명시
 */
export default function GeoSourceSummary({
  variant = 'default',
}: {
  variant?: 'default' | 'compact'
}) {
  const box =
    variant === 'compact'
      ? 'rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-xs text-slate-700'
      : 'rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800'

  return (
    <aside className={box} aria-label="서비스 출처 및 한계">
      <p className="font-medium text-slate-900">이 서비스가 하는 일</p>
      <p className="mt-1 leading-relaxed text-slate-700">
        <strong>지원둥지</strong>는 중소기업·창업{' '}
        <strong>지원사업 공고</strong>를 검색·정리하고, 참고용 자격 판정·문서 초안을 돕습니다. 공고 본문은{' '}
        <strong>기업마당·K-Startup·중소벤처24</strong> 등 공공 출처에서 수집합니다.
      </p>
      <p className="mt-2 font-medium text-slate-900">인용·확인 시 참고</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-slate-700">
        <li>심사·적격·지원 확정은 <strong>주관기관·공고 원문</strong>이 최종 기준입니다.</li>
        <li>AI·룰 엔진 결과는 <strong>법적 효력이 없는 참고 정보</strong>입니다.</li>
      </ul>
      <p className="mt-2">
        <Link href="/disclaimer" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">
          법적 고지
        </Link>
        {' · '}
        <Link href="/faq" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">
          자주 묻는 질문
        </Link>
        {' · '}
        <Link href="/contact" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">
          오류 신고
        </Link>
      </p>
    </aside>
  )
}
