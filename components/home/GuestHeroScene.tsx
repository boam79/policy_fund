/** 목업 안 A — 구형 로봇 + 둥지 + 말풍선 */
export default function GuestHeroScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="지원둥지 AI 도우미"
    >
      <ellipse cx="120" cy="228" rx="56" ry="8" fill="#93C5FD" fillOpacity="0.35" />

      {/* 로봇 본체 — 구형 */}
      <circle cx="118" cy="142" r="62" fill="#3B82F6" />
      <circle cx="118" cy="142" r="52" fill="#60A5FA" />
      <line x1="118" y1="86" x2="118" y2="68" stroke="#1D4ED8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="118" cy="62" r="7" fill="#FBBF24" />

      {/* 눈 — 곡선 미소 스타일 */}
      <path d="M 98 132 Q 98 122 108 124" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M 138 132 Q 138 122 128 124" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M 104 150 Q 118 158 132 150" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* 돋보기 */}
      <circle cx="48" cy="128" r="20" stroke="#1D4ED8" strokeWidth="5" fill="#EFF6FF" />
      <line x1="62" y1="142" x2="78" y2="158" stroke="#1D4ED8" strokeWidth="5" strokeLinecap="round" />

      {/* 둥지 집 */}
      <g transform="translate(220 108)">
        <path
          d="M 40 8 L 72 8 L 88 36 L 24 36 Z"
          fill="#3B82F6"
          stroke="#2563EB"
          strokeWidth="2"
        />
        <rect x="32" y="36" width="48" height="44" rx="4" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="2" />
        <circle cx="56" cy="28" r="10" fill="#FCD34D" />
        <path d="M 50 26 Q 56 18 62 26" fill="#F59E0B" />
      </g>

      {/* 말풍선 */}
      <ellipse cx="268" cy="72" rx="40" ry="26" fill="white" stroke="#BFDBFE" strokeWidth="2" />
      <path d="M 248 90 L 238 108 L 258 96 Z" fill="white" stroke="#BFDBFE" strokeWidth="2" />
      <circle cx="256" cy="70" r="3.5" fill="#93C5FD" />
      <circle cx="268" cy="70" r="3.5" fill="#93C5FD" />
      <circle cx="280" cy="70" r="3.5" fill="#93C5FD" />
    </svg>
  )
}
