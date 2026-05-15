'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Building2, FileText, Search, LogOut, Loader2, Save, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Profile {
  company_name: string; region: string; city: string; industry: string;
  business_age_years: number | null; employee_count: number | null;
  annual_revenue_krw: number | null; tax_arrears: boolean;
  business_type: string; startup_stage: string;
}

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']
const INDUSTRIES = ['제조업', 'IT/소프트웨어', '서비스업', '도소매업', '건설업', '농림어업', '바이오/헬스케어', '문화/콘텐츠', '기타']
const STAGES = ['', '예비창업', '창업 1년 미만', '초기(1~3년)', '성장(3~7년)', '도약(7년 이상)']

export default function MyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<Partial<Profile>>({})
  const [profileId, setProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'profile' | 'docs' | 'searches'>('profile')
  const [docs, setDocs] = useState<{ id: string; doc_type: string; title: string; created_at: string }[]>([])
  const [searches, setSearches] = useState<{ id: string; natural_language_query: string; created_at: string }[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? '')
      setUserId(user.id)

      const [profRes, docsRes, searchRes] = await Promise.all([
        supabase.from('business_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('generated_documents').select('id,doc_type,title,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('search_sessions').select('id,natural_language_query,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])

      if (profRes.data) {
        setProfileId(profRes.data.id as string)
        setProfile(profRes.data as unknown as Profile)
      }
      setDocs((docsRes.data ?? []) as typeof docs)
      setSearches((searchRes.data ?? []) as typeof searches)
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const record = { ...profile, user_id: userId }
    if (profileId) {
      await supabase.from('business_profiles').update(record).eq('id', profileId)
    } else {
      const { data } = await supabase.from('business_profiles').insert(record).select('id').single()
      if (data) setProfileId(data.id as string)
    }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const set = (k: keyof Profile, v: unknown) => setProfile(p => ({ ...p, [k]: v }))

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{userEmail}</p>
              <p className="text-xs text-gray-400">PolicyFund AI 회원</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="h-4 w-4" />로그아웃
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border p-1">
          {([['profile', '기업 프로필', Building2], ['docs', '생성 문서', FileText], ['searches', '검색 기록', Search]] as [typeof tab, string, React.ElementType][]).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {/* 프로필 탭 */}
        {tab === 'profile' && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">기업 프로필</h2>
            <p className="text-xs text-gray-400 mb-4">입력한 정보는 자격 판정 및 맞춤 검색에 자동으로 활용됩니다.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">회사명</label>
                <input value={profile.company_name ?? ''} onChange={e => set('company_name', e.target.value)}
                  placeholder="(주)폴리시펀드" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">지역</label>
                <select value={profile.region ?? ''} onChange={e => set('region', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">선택</option>
                  {REGIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">업종</label>
                <select value={profile.industry ?? ''} onChange={e => set('industry', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">선택</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">업력 (년)</label>
                <input type="number" value={profile.business_age_years ?? ''} onChange={e => set('business_age_years', e.target.value ? Number(e.target.value) : null)}
                  placeholder="3" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">직원 수</label>
                <input type="number" value={profile.employee_count ?? ''} onChange={e => set('employee_count', e.target.value ? Number(e.target.value) : null)}
                  placeholder="10" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">연매출 (원)</label>
                <input type="number" value={profile.annual_revenue_krw ?? ''} onChange={e => set('annual_revenue_krw', e.target.value ? Number(e.target.value) : null)}
                  placeholder="500000000" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">창업 단계</label>
                <select value={profile.startup_stage ?? ''} onChange={e => set('startup_stage', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {STAGES.map(s => <option key={s} value={s}>{s || '선택'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">기업 형태</label>
                <select value={profile.business_type ?? ''} onChange={e => set('business_type', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">선택</option>
                  <option value="법인">법인</option>
                  <option value="개인">개인사업자</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input type="checkbox" id="tax" checked={profile.tax_arrears ?? false} onChange={e => set('tax_arrears', e.target.checked)} className="h-4 w-4" />
                <label htmlFor="tax" className="text-sm text-gray-700">세금 체납 이력이 있습니다</label>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                저장
              </button>
              {saved && <span className="text-sm text-green-600">✓ 저장되었습니다</span>}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/mypage/billing"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <CreditCard className="h-4 w-4" />결제 관리 · 구독 현황 →
              </Link>
            </div>
          </div>
        )}

        {/* 생성 문서 탭 */}
        {tab === 'docs' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            {docs.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>생성된 문서가 없습니다.</p>
                <a href="/documents/plan" className="text-xs text-blue-500 hover:underline mt-1 block">사업계획서 초안 생성하기 →</a>
              </div>
            ) : docs.map(d => (
              <div key={d.id} className="border-b last:border-0 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.title ?? '제목 없음'}</p>
                  <p className="text-xs text-gray-400">{d.doc_type} · {new Date(d.created_at).toLocaleDateString('ko-KR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 검색 기록 탭 */}
        {tab === 'searches' && (
          <div className="bg-white rounded-xl border overflow-hidden">
            {searches.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>검색 기록이 없습니다.</p>
                <a href="/search" className="text-xs text-blue-500 hover:underline mt-1 block">지원사업 검색하기 →</a>
              </div>
            ) : searches.map(s => (
              <div key={s.id} className="border-b last:border-0 p-4">
                <p className="text-sm text-gray-800">{s.natural_language_query ?? '조건 검색'}</p>
                <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('ko-KR')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
