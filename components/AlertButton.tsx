'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AlertButton({ programId }: { programId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [saveId, setSaveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('saved_programs')
        .select('id')
        .eq('user_id', user.id)
        .eq('program_id', programId)
        .single()
      if (data) setSaveId(data.id as string)
      setLoading(false)
    }
    init()
  }, [programId])

  const toggle = async () => {
    if (!userId) { router.push(`/login?next=/search/${programId}`); return }
    setToggling(true)
    if (saveId) {
      await supabase.from('saved_programs').delete().eq('id', saveId)
      setSaveId(null)
    } else {
      const { data } = await supabase
        .from('saved_programs')
        .insert({ user_id: userId, program_id: programId })
        .select('id').single()
      if (data) setSaveId(data.id as string)
    }
    setToggling(false)
  }

  if (loading) return null

  return (
    <button onClick={toggle} disabled={toggling}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
        saveId
          ? 'bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}>
      {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : saveId ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {saveId ? '저장됨' : '저장'}
    </button>
  )
}
