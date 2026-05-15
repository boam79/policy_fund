import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { Building2, MapPin, Calendar, ExternalLink, ArrowLeft, Clock } from 'lucide-react'
import Link from 'next/link'
import AlertButton from '@/components/AlertButton'

const LEGAL_DISCLAIMER = '본 자격판정 결과는 AI 기반 참고 정보이며 법적 효력이 없습니다. 실제 신청 가능 여부는 해당 지원기관의 공식 공고문과 담당자에게 반드시 확인하세요. 폴리시펀드는 판정 결과의 정확성을 보장하지 않습니다.'

export const dynamic = 'force-dynamic'

async function getProgram(id: string) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('support_programs')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

const SOURCE_LABEL: Record<string, string> = {
  bizinfo: '기업마당',
  kstartup: 'K-Startup',
  smes24: '중소벤처24',
}

function DaysLeftBadge({ endDate }: { endDate: string | null }) {
  if (!endDate) return null
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const days = Math.ceil((new Date(endDate).getTime() - now) / (1000 * 60 * 60 * 24))
  if (days < 0) return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">마감</span>
  if (days === 0) return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 font-bold">오늘 마감</span>
  if (days <= 7) return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">D-{days}</span>
  return <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">D-{days}</span>
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const program = await getProgram(id)
  if (!program) notFound()

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const daysLeft = program.application_end_date
    ? Math.ceil((new Date(program.application_end_date).getTime() - now) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* 뒤로가기 */}
        <Link href="/search" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          검색 결과로 돌아가기
        </Link>

        {/* 공고 헤더 */}
        <div className="bg-white rounded-xl border p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {program.source && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {SOURCE_LABEL[program.source] ?? program.source}
                  </span>
                )}
                {program.industry && (
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                    {program.industry}
                  </span>
                )}
                <DaysLeftBadge endDate={program.application_end_date} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 leading-snug">{program.title}</h1>
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {program.organization && (
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="주관기관" value={program.organization} />
            )}
            {program.region && (
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="지원지역" value={program.region} />
            )}
            {program.application_start_date && (
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="접수 시작" value={program.application_start_date} />
            )}
            {program.application_end_date && (
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label="접수 마감"
                value={`${program.application_end_date}${daysLeft !== null && daysLeft >= 0 ? ` (D-${daysLeft})` : ' (마감)'}`}
              />
            )}
            {(program.support_amount_min_krw || program.support_amount_max_krw) && (
              <InfoRow
                icon={<span className="text-sm">₩</span>}
                label="지원금액"
                value={formatAmount(program.support_amount_min_krw, program.support_amount_max_krw)}
              />
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="mt-4 flex gap-2">
            {program.application_url && (
              <a href={program.application_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                공식 공고 바로가기 <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <AlertButton programId={program.id} />
          </div>
        </div>

        {/* 지원 내용 */}
        {program.support_type && (
          <Section title="지원 내용">
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {stripHtml(program.support_type)}
            </p>
          </Section>
        )}

        {/* 지원 대상 */}
        {program.eligibility_text && (
          <Section title="신청 자격">
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {stripHtml(program.eligibility_text)}
            </p>
          </Section>
        )}

        {/* 제외 대상 */}
        {program.exclusion_text && (
          <Section title="지원 제외 대상">
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed text-red-700">
              {stripHtml(program.exclusion_text)}
            </p>
          </Section>
        )}

        {/* 필요 서류 */}
        {program.required_docs && (
          <Section title="제출 서류">
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {typeof program.required_docs === 'string'
                ? stripHtml(program.required_docs)
                : JSON.stringify(program.required_docs)}
            </p>
          </Section>
        )}

        {/* 자격판정 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
          <h2 className="font-semibold text-blue-800 mb-2">🔍 자격판정 받기</h2>
          <p className="text-sm text-blue-700 mb-3">
            내 기업 정보를 입력하면 AI가 이 공고에 대한 자격 충족 여부를 즉시 분석해드립니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/eligibility?program_id=${program.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              자격판정 시작하기
            </Link>
            <Link
              href={`/documents/plan?program_id=${program.id}&tab=checklist`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              신청 준비 시작하기
            </Link>
          </div>
        </div>

        {/* 법적 고지 */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800 leading-relaxed">
            ⚠️ {LEGAL_DISCLAIMER}
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-5 mb-4">
      <h2 className="font-semibold text-gray-800 mb-3">{title}</h2>
      {children}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 font-medium">{value}</p>
      </div>
    </div>
  )
}

function formatAmount(min: number | null, max: number | null): string {
  const fmt = (n: number) => {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(0)}억원`
    if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
    return `${n.toLocaleString()}원`
  }
  if (min && max) return `${fmt(min)} ~ ${fmt(max)}`
  if (max) return `최대 ${fmt(max)}`
  if (min) return `${fmt(min)} 이상`
  return ''
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}
