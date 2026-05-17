/**
 * POST /api/eligibility
 * 특정 공고에 대한 룰 기반 자격판정 + Gemini LLM 설명 보완
 * LLM은 설명 생성만 담당, 판정 결과는 룰 엔진이 결정
 */

import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import {
  checkEligibility,
  eligibilityLabel,
  type CompanyProfile,
} from '@/lib/gov-support/tools/eligibility'
import { GoogleGenAI } from '@google/genai'
import { takeRateLimit } from '@/lib/security/rateLimit'
import { apiError, createTraceId, logApiError } from '@/lib/errors/apiError'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkUsageLimit, recordUsage } from '@/lib/billing/usage'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const traceId = createTraceId()
  try {
    const rate = takeRateLimit(request, 'api:eligibility', { windowMs: 60_000, max: 30 })
    if (!rate.ok) {
      return apiError({
        status: 429,
        errorCode: 'ELIGIBILITY_RATE_LIMITED',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        step: 'eligibility.rate_limit',
        traceId,
      })
    }

    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const n = parseInt(contentLength, 10)
      if (Number.isFinite(n) && n > 180_000) {
        return apiError({
          status: 413,
          errorCode: 'ELIGIBILITY_BODY_TOO_LARGE',
          message: '요청 본문이 너무 큽니다.',
          step: 'eligibility.validate',
          traceId,
        })
      }
    }

    const body = await request.json()
    const { program_id, profile } = body as {
      program_id: string
      profile: CompanyProfile
    }

    if (!program_id) {
      return apiError({
        status: 400,
        errorCode: 'ELIGIBILITY_PROGRAM_ID_REQUIRED',
        message: 'program_id 필수',
        step: 'eligibility.validate',
        traceId,
      })
    }

    let billingUserId: string | null = null
    try {
      const serverAuth = await createServerClient()
      const {
        data: { user },
      } = await serverAuth.auth.getUser()
      billingUserId = user?.id ?? null

      /** 비로그인: LLM·비용 남용 방지 — 분당 한도 외에 시간당 상한 (로그인 시 월간 플랜 한도 적용) */
      if (!billingUserId) {
        const anonHour = takeRateLimit(request, 'api:eligibility:anon-hour', {
          windowMs: 3_600_000,
          max: 45,
        })
        if (!anonHour.ok) {
          return apiError({
            status: 429,
            errorCode: 'ELIGIBILITY_ANON_HOUR_LIMIT',
            message:
              '비로그인 상태에서는 자격 판정 호출이 시간당 제한됩니다. 로그인하면 월간 이용 한도로 이용할 수 있습니다.',
            step: 'eligibility.anon_hour_limit',
            traceId,
          })
        }
      }

      if (billingUserId) {
        const gate = await checkUsageLimit(billingUserId, 'eligibility_check')
        if (!gate.allowed) {
          return apiError({
            status: 403,
            errorCode: 'USAGE_ELIGIBILITY_LIMIT',
            message: `이번 달 AI 자격·적합 판정 한도를 모두 사용했습니다. (사용 ${gate.used}/${gate.limit}회)`,
            step: 'eligibility.usage_limit',
            traceId,
          })
        }
      }
    } catch (usageErr) {
      console.error('[eligibility] usage gate', usageErr)
      return apiError({
        status: 503,
        errorCode: 'USAGE_CHECK_FAILED',
        message: '이용량 확인에 실패했습니다. 잠시 후 다시 시도해주세요.',
        step: 'eligibility.usage_gate',
        traceId,
      })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 공고 조회
    const { data: program, error } = await supabase
      .from('support_programs')
      .select('*')
      .eq('id', program_id)
      .single()

    if (error || !program) {
      return apiError({
        status: 404,
        errorCode: 'ELIGIBILITY_PROGRAM_NOT_FOUND',
        message: '공고를 찾을 수 없습니다.',
        step: 'eligibility.fetch_program',
        traceId,
      })
    }

    // 룰 기반 자격판정
    const eligibility = checkEligibility(profile, {
      title: program.title,
      region: program.region,
      industry: program.industry,
      industry_tags: program.industry_tags ?? null,
      eligibility_text: program.eligibility_text,
      exclusion_text: program.exclusion_text,
      support_type: program.support_type,
      support_amount_min_krw: program.support_amount_min_krw,
      support_amount_max_krw: program.support_amount_max_krw,
      target_business_type: program.target_business_type,
    })

    // LLM 설명 생성 (판정 결과는 변경하지 않음)
    let explanation = ''
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey })
        const prompt = `다음 지원사업에 대한 자격판정 결과를 2~3문장으로 설명해주세요. 친절하고 명확하게 작성하세요.

지원사업: ${program.title}
기관: ${program.organization ?? '미상'}
판정 결과: ${eligibilityLabel(eligibility.status)}
충족 조건: ${eligibility.passed.join(', ') || '없음'}
미충족/검토 조건: ${eligibility.failed.join(', ') || '없음'}
판단 불가 항목: ${eligibility.unknown.join(', ') || '없음'}

[주의] 최종 판정 결과(${eligibilityLabel(eligibility.status)})는 변경하지 말고, 이유와 다음 조치만 설명하세요.`

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
        })
        explanation = response.text ?? ''
      } catch (e) {
        console.warn('[eligibility] LLM 설명 생성 실패:', e)
        explanation = `${eligibilityLabel(eligibility.status)} 판정입니다. 상세 내용을 공고문에서 확인하세요.`
      }
    }

    // eligibility_checks 저장
    try {
      await supabase.from('eligibility_checks').insert({
        program_id,
        user_id: billingUserId,
        status: eligibility.status,
        score: eligibility.score,
        matched_conditions: JSON.parse(JSON.stringify(eligibility.passed)),
        unmatched_conditions: JSON.parse(JSON.stringify(eligibility.failed)),
        llm_explanation: explanation || null,
      })
    } catch {
      // 저장 실패 무시
    }

    if (billingUserId) {
      await recordUsage(billingUserId, 'eligibility_check')
    }

    return Response.json({
      ok: true,
      program_id,
      status: eligibility.status,
      label: eligibilityLabel(eligibility.status),
      score: eligibility.score,
      passed: eligibility.passed,
      failed: eligibility.failed,
      unknown: eligibility.unknown,
      explanation,
      trace_id: traceId,
    })
  } catch (e: unknown) {
    logApiError('/api/eligibility', traceId, e)
    return apiError({
      status: 500,
      errorCode: 'ELIGIBILITY_INTERNAL_ERROR',
      message: '자격판정 중 오류가 발생했습니다.',
      step: 'eligibility.execute',
      traceId,
    })
  }
}
