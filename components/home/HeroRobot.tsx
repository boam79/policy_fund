/** 비로그인 히어로용 귀여운 AI 로봇 일러스트 (SVG) */
export default function HeroRobot({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="지원둥지 AI 도우미"
    >
      {/* 그림자 */}
      <ellipse cx="100" cy="208" rx="52" ry="8" fill="#93C5FD" fillOpacity="0.35" />

      {/* 몸통 */}
      <rect x="52" y="88" width="96" height="88" rx="28" fill="#3B82F6" />
      <rect x="60" y="96" width="80" height="72" rx="22" fill="#60A5FA" />

      {/* 가슴 패널 */}
      <rect x="78" y="118" width="44" height="36" rx="10" fill="#DBEAFE" />
      <circle cx="100" cy="132" r="6" fill="#2563EB" />
      <rect x="92" y="140" width="16" height="4" rx="2" fill="#93C5FD" />

      {/* 머리 */}
      <rect x="58" y="32" width="84" height="68" rx="26" fill="#3B82F6" />
      <rect x="66" y="40" width="68" height="52" rx="20" fill="#60A5FA" />

      {/* 안테나 */}
      <line x1="100" y1="32" x2="100" y2="14" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="10" r="7" fill="#FBBF24" className="animate-pulse" />
      <circle cx="100" cy="10" r="4" fill="#FEF3C7" />

      {/* 눈 */}
      <ellipse cx="82" cy="62" rx="10" ry="12" fill="white" />
      <ellipse cx="118" cy="62" rx="10" ry="12" fill="white" />
      <circle cx="84" cy="64" r="5" fill="#1E3A8A" />
      <circle cx="120" cy="64" r="5" fill="#1E3A8A" />
      <circle cx="86" cy="62" r="1.5" fill="white" />
      <circle cx="122" cy="62" r="1.5" fill="white" />

      {/* 볼 */}
      <circle cx="72" cy="74" r="5" fill="#FCA5A5" fillOpacity="0.55" />
      <circle cx="128" cy="74" r="5" fill="#FCA5A5" fillOpacity="0.55" />

      {/* 입 */}
      <path
        d="M 88 78 Q 100 86 112 78"
        stroke="#1E40AF"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* 팔 — 왼쪽 (돋보기) */}
      <rect x="28" y="108" width="28" height="14" rx="7" fill="#3B82F6" transform="rotate(-18 42 115)" />
      <circle cx="24" cy="98" r="14" stroke="#2563EB" strokeWidth="4" fill="#EFF6FF" />
      <line x1="30" y1="104" x2="18" y2="92" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />

      {/* 팔 — 오른쪽 (문서) */}
      <rect x="144" y="108" width="28" height="14" rx="7" fill="#3B82F6" transform="rotate(18 158 115)" />
      <rect x="162" y="88" width="22" height="28" rx="4" fill="white" stroke="#2563EB" strokeWidth="2" />
      <line x1="166" y1="96" x2="180" y2="96" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="166" y1="102" x2="178" y2="102" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="166" y1="108" x2="176" y2="108" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />

      {/* 다리 */}
      <rect x="72" y="172" width="22" height="18" rx="8" fill="#2563EB" />
      <rect x="106" y="172" width="22" height="18" rx="8" fill="#2563EB" />
    </svg>
  )
}
