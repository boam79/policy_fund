/** 목업 안 A 히어로 일러스트 — 흰색 로봇 + 관공서 + 스카이라인 + 말풍선 */
export default function GuestHeroScene({ className }: { className?: string }) {
  const stroke = '#3B82F6'
  const strokeDark = '#2563EB'
  const fillLight = '#DBEAFE'
  const fillPale = '#EFF6FF'
  const visor = '#1D4ED8'

  return (
    <svg
      viewBox="0 0 400 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="지원둥지 AI 검색 도우미"
    >
      {/* 구름 */}
      <ellipse cx="52" cy="42" rx="28" ry="14" fill={fillLight} opacity="0.9" />
      <ellipse cx="42" cy="40" rx="18" ry="12" fill={fillLight} opacity="0.7" />
      <ellipse cx="348" cy="38" rx="26" ry="13" fill={fillLight} opacity="0.9" />
      <ellipse cx="360" cy="36" rx="16" ry="10" fill={fillLight} opacity="0.7" />

      {/* 좌측 관공서 건물 */}
      <g opacity="0.85">
        <path
          d="M 24 168 L 24 108 L 32 100 L 88 100 L 96 108 L 96 168 Z"
          fill={fillPale}
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M 16 100 L 60 72 L 104 100 Z" fill={fillLight} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <line x1="40" y1="168" x2="40" y2="112" stroke={stroke} strokeWidth="2" />
        <line x1="56" y1="168" x2="56" y2="112" stroke={stroke} strokeWidth="2" />
        <line x1="72" y1="168" x2="72" y2="112" stroke={stroke} strokeWidth="2" />
        <line x1="88" y1="168" x2="88" y2="112" stroke={stroke} strokeWidth="2" />
        <line x1="58" y1="78" x2="58" y2="68" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <path d="M 54 68 L 58 62 L 62 68 Z" fill={stroke} />
      </g>

      {/* 우측 스카이라인 */}
      <g opacity="0.85">
        <rect x="300" y="128" width="28" height="72" rx="2" fill={fillLight} stroke={stroke} strokeWidth="2" />
        <rect x="334" y="108" width="24" height="92" rx="2" fill={fillPale} stroke={stroke} strokeWidth="2" />
        <rect x="364" y="118" width="22" height="82" rx="2" fill={fillLight} stroke={stroke} strokeWidth="2" />
      </g>

      {/* 로봇 — 흰색 본체 + 파란 테두리 */}
      <g transform="translate(148 52)">
        {/* 몸통 */}
        <rect x="52" y="108" width="72" height="78" rx="28" fill="white" stroke={stroke} strokeWidth="2.5" />
        {/* 머리 */}
        <circle cx="88" cy="72" r="52" fill="white" stroke={stroke} strokeWidth="2.5" />
        {/* 안테나 */}
        <line x1="88" y1="22" x2="88" y2="8" stroke={strokeDark} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="88" cy="6" r="5" fill="white" stroke={strokeDark} strokeWidth="2" />
        {/* 바이저 */}
        <rect x="58" y="58" width="60" height="28" rx="14" fill={visor} />
        {/* 눈 */}
        <path
          d="M 70 68 Q 74 62 78 68"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 98 68 Q 102 62 106 68"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* 왼팔 + 돋보기 */}
        <path
          d="M 52 130 Q 28 128 18 118"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="14" cy="112" r="16" fill="white" stroke={strokeDark} strokeWidth="2.5" />
        <circle cx="14" cy="112" r="10" fill={fillPale} stroke={stroke} strokeWidth="1.5" />
        <line x1="26" y1="124" x2="38" y2="136" stroke={strokeDark} strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* 말풍선 — 머리 오른쪽 */}
      <g>
        <circle cx="318" cy="88" r="28" fill={fillPale} stroke={stroke} strokeWidth="2" />
        <circle cx="308" cy="86" r="3" fill="#93C5FD" />
        <circle cx="318" cy="86" r="3" fill="#93C5FD" />
        <circle cx="328" cy="86" r="3" fill="#93C5FD" />
      </g>

      {/* 바닥 그림자 */}
      <ellipse cx="236" cy="238" rx="48" ry="6" fill="#93C5FD" fillOpacity="0.25" />
    </svg>
  )
}
