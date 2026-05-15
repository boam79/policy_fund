export default function Page() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-xl border bg-muted/30 p-12 text-center">
          <a href="/mypage" className="text-sm text-blue-600 hover:underline">← 이전으로</a>
        <h1 className="mb-3 text-3xl font-bold">내 신청 관리</h1>
        <p className="text-muted-foreground">관심 공고, 알림 프로파일을 관리합니다.</p>
        <p className="mt-4 text-sm text-orange-500">🚧 개발 예정 (Phase 구현 중)</p>
      </div>
    </div>
  )
}
