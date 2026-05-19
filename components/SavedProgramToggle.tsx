'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function SavedProgramToggle({
  programId,
  compact = false,
  className,
}: {
  programId: string
  compact?: boolean
  className?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [saveId, setSaveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setUserId(user.id)
      const { data } = await supabase
        .from('saved_programs')
        .select('id')
        .eq('user_id', user.id)
        .eq('program_id', programId)
        .maybeSingle()
      if (data) setSaveId(data.id as string)
      setLoading(false)
    }
    void init()
  }, [programId, supabase])

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) {
      router.push(`/login?next=/search/${programId}`)
      return
    }
    setToggling(true)
    if (saveId) {
      await supabase.from('saved_programs').delete().eq('id', saveId)
      setSaveId(null)
    } else {
      const { data } = await supabase
        .from('saved_programs')
        .insert({ user_id: userId, program_id: programId })
        .select('id')
        .single()
      if (data) setSaveId(data.id as string)
    }
    setToggling(false)
  }

  if (loading) return null

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={toggling}
      aria-label={saveId ? '찜 해제' : '찜하기'}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg text-sm font-medium transition-colors',
        compact ? 'p-1.5' : 'px-3 py-2',
        saveId
          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent',
        className
      )}
    >
      {toggling ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : saveId ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
      {!compact && (saveId ? '찜됨' : '찜')}
    </button>
  )
}
