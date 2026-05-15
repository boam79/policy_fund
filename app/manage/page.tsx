'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Bookmark, BookmarkX, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SavedProgram {
  id: string
  program_id: string
  created_at: string
  program: {
    title: string
    organization: string | null
    application_end_date: string | null
    status: string | null
    source: string | null
  } | null
}

const SOURCE_LABEL: Record<string, string> = { bizinfo: '기업마당', kstartup: 'K-Startup', smes24: '중소벤처24' }

export default function ManagePage() {
  const router = useRouter()
  const supabase = createClient()
  const [saves, setSaves] = useState<SavedProgram[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login?next=/manage'); return }

      const { data } = await supabase
        .from('saved_programs')
        .select('id, program_id, created_at, program:support_programs(title,organization,application_end_date,status,source)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setSaves((data ?? []) as unknown as SavedProgram[])
      setLoading(false)
    }
    load()
  }, [])

  const remove = async (id: string) => {
    await supabase.from('saved_programs').delete().eq('id', id)
    setSaves(s => s.filter(x => x.id !== id))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 신청 관리</h1>
            <p className="text-sm text-gray-500">저장한 공고 {saves.length}건</p>
          </div>
          <Link href="/search" className="text-sm text-blue-600 hover:underline">공고 찾기 →</Link>
        </div>

        {saves.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Bookmark className="h-10 w-10 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 font-medium">저장한 공고가 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">공고 상세 페이지에서 북마크 버튼으로 저장할 수 있습니다.</p>
            <Link href="/search" className="mt-4 inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              공고 검색하러 가기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {saves.map(s => {
              const prog = s.program
              const daysLeft = prog?.application_end_date
                ? Math.ceil((new Date(prog.application_end_date).getTime() - Date.now()) / 86400000)
                : null
              return (
                <div key={s.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{prog?.title ?? '공고명 없음'}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-xs text-gray-500">{prog?.organization ?? '-'}</p>
                        {prog?.source && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            {SOURCE_LABEL[prog.source] ?? prog.source}
                          </span>
                        )}
                        {daysLeft !== null && daysLeft >= 0 && (
                          <span className={`text-xs font-medium ${daysLeft <= 7 ? 'text-red-600' : 'text-blue-600'}`}>D-{daysLeft}</span>
                        )}
                        {daysLeft !== null && daysLeft < 0 && <span className="text-xs text-gray-400">마감</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">저장일 {new Date(s.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Link href={`/search/${s.program_id}`}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button onClick={() => remove(s.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <BookmarkX className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
