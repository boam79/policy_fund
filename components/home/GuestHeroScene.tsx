/** 목업 안 A — 원형 로봇 + 관공서 건물 + 말풍선 */
export default function GuestHeroScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-hidden
    >
      {/* 말풍선 */}
      <ellipse cx="248" cy="52" rx="36" ry="24" fill="white" stroke="#BFDBFE" strokeWidth="2" />
      <path d="M 228 68 L 220 82 L 238 72 Z" fill="white" stroke="#BFDBFE" strokeWidth="2" />
      <circle cx="238" cy="48" r="3" fill="#93C5FD" />
      <circle cx="248" cy="48" r="3" fill="#93C5FD" />
      <circle cx="258" cy="48" r="3" fill="#93C5FD" />

      {/* 관공서 건물 */}
      <rect x="198" y="118" width="100" height="72" rx="4" fill="#E0E7FF" stroke="#93C5FD" strokeWidth="2" />
      <path d="M 188 118 L 248 88 L 308 118 Z" fill="#3B82F6" stroke="#2563EB" strokeWidth="2" />
      <rect x="218" y="138" width="14" height="52" fill="#DBEAFE" />
      <rect x="242" y="138" width="14" height="52" fill="#DBEAFE" />
      <rect x="266" y="138" width="14" height="52" fill="#DBEAFE" />
      <rect x="232" y="108" width="32" height="12" rx="2" fill="#60A5FA" />

      {/* 원형 로봇 */}
      <circle cx="108" cy="130" r="56" fill="#3B82F6" />
      <circle cx="108" cy="130" r="48" fill="#60A5FA" />
      <line x1="108" y1="78" x2="108" y2="62" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
      <circle cx="108" cy="56" r="6" fill="#FBBF24" />

      <path d="M 88 122 Q 88 108 108 108 Q 128 108 128 122" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="94" cy="118" r="4" fill="#1E3A8A" />
      <circle cx="122" cy="118" r="4" fill="#1E3A8A" />

      {/* 돋보기 */}
      <circle cx="52" cy="108" r="18" stroke="#2563EB" strokeWidth="5" fill="#EFF6FF" />
      <line x1="64" y1="120" x2="78" y2="134" stroke="#2563EB" strokeWidth="5" strokeLinecap="round" />

      <ellipse cx="108" cy="198" rx="40" ry="6" fill="#93C5FD" fillOpacity="0.4" />
    </svg>
  )
}
