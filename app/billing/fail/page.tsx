'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

function FailContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') ?? '결제가 취소되었거나 실패했습니다.'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border p-10 text-center max-w-md shadow-sm">
        <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">결제 실패</h1>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex flex-col gap-2">
          <Link href="/pricing" className="py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
            요금제 다시 보기
          </Link>
          <Link href="/" className="py-3 text-gray-400 hover:text-gray-600 text-sm">홈으로</Link>
        </div>
      </div>
    </div>
  )
}

export default function FailPage() {
  return <Suspense><FailContent /></Suspense>
}
