/**
 * Gemini API 래퍼 — 서버 전용
 * Context7 참조: googleapis/js-genai (v2.2.0)
 * SDK: @google/genai
 *
 * 역할 제한 (PRD §5.1):
 *   - 조건 추출 (자연어 → BusinessConditions)
 *   - 자격판정 설명 보완 (룰 엔진 결과 후처리)
 *   - 사업계획서 초안 생성
 *   금지: 공고 생성, 공고 검색, 자격판정 상태값 직접 결정
 */

import { GoogleGenAI, Type } from '@google/genai'
import type { Schema } from '@google/genai'

export { Type }

// Context7: gemini-2.5-flash — 빠른 응답, JSON 구조화 출력 지원
export const GEMINI_MODEL = 'gemini-2.5-flash'
export const GEMINI_MODEL_PRO = 'gemini-2.5-pro'

let _client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.')
    }
    _client = new GoogleGenAI({ apiKey })
  }
  return _client
}

export interface GeminiTextOptions {
  model?: string
  systemInstruction?: string
  maxOutputTokens?: number
  temperature?: number
}

/**
 * 단순 텍스트 응답 생성 (비스트리밍)
 * Context7 패턴: ai.models.generateContent → response.text
 */
export async function geminiText(
  prompt: string,
  options: GeminiTextOptions = {}
): Promise<string> {
  const ai = getClient()
  const {
    model = GEMINI_MODEL,
    systemInstruction,
    maxOutputTokens = 1024,
    temperature = 0.3,
  } = options

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      maxOutputTokens,
      temperature,
    },
  })

  return response.text ?? ''
}

/**
 * 구조화 JSON 응답 생성
 * Context7 패턴: responseMimeType + responseSchema → response.text는 유효한 JSON 보장
 *
 * @param prompt    사용자 프롬프트
 * @param schema    Gemini Schema 객체 (Type.OBJECT 등)
 * @param options   생성 옵션
 */
export async function geminiJSON<T = unknown>(
  prompt: string,
  schema: Schema,
  options: GeminiTextOptions = {}
): Promise<T> {
  const ai = getClient()
  const {
    model = GEMINI_MODEL,
    systemInstruction,
    maxOutputTokens = 2048,
    temperature = 0.1,
  } = options

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      maxOutputTokens,
      temperature,
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  })

  const raw = response.text ?? ''
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`Gemini JSON 파싱 실패: ${raw.slice(0, 200)}`)
  }
}

/**
 * 스트리밍 텍스트 생성 (Next.js Route Handler용 ReadableStream)
 * Context7 패턴: ai.models.generateContentStream → AsyncGenerator
 */
export async function geminiStream(
  prompt: string,
  options: GeminiTextOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const ai = getClient()
  const {
    model = GEMINI_MODEL,
    systemInstruction,
    maxOutputTokens = 4096,
    temperature = 0.5,
  } = options

  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            maxOutputTokens,
            temperature,
          },
        })

        for await (const chunk of stream) {
          if (chunk.text) {
            controller.enqueue(encoder.encode(chunk.text))
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
