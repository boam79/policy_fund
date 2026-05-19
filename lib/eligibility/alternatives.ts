import { runProgramSearch } from '@/lib/gov-support/tools/runProgramSearch'

export type EligibilityAlternative = {
  id: string
  title: string
  region: string | null
  application_end_date: string | null
}

export async function fetchEligibilityAlternatives(input: {
  program_id: string
  region?: string
  industry?: string
  limit?: number
}): Promise<EligibilityAlternative[]> {
  const { result } = await runProgramSearch(
    {
      region: input.region,
      industry: input.industry,
      limit: input.limit ?? 3,
      page: 1,
    },
    'relaxed'
  )

  return result.programs
    .filter((p) => p.id !== input.program_id)
    .slice(0, input.limit ?? 3)
    .map((p) => ({
      id: p.id,
      title: p.title,
      region: p.region,
      application_end_date: p.application_end_date,
    }))
}
