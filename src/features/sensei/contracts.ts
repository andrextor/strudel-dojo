// Request parsers for /api/sensei/* (docs/specs/06). Type guards only, no `any`; sizes are
// checked before anything is parsed. User code is never run on the server: the browser runs the
// assertions and sends their results, which only feed the prompt (spec 06).
import type { Response as Answer, Question } from '../exercises/types.ts'
import { readAnswer, readInput, readResponse } from '../progress/persist.ts'

export const MAX_BODY = 32_000
export const MAX_CODE = 8_000

export type HintRequest =
  | {
      context: 'question'
      question: Pick<Question, 'prompt' | 'input' | 'skill' | 'answer'>
      response: Answer | null
    }
  | { context: 'kata'; kataId: string; code: string; failing: string[] }

export interface CheckResult {
  type: string
  pass: boolean
  message: string
}

export interface ReviewRequest {
  bossId: string
  code: string
  checks: CheckResult[]
  summary: string // JSON of what the code plays, from the browser
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: 400 | 413; error: string }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const BAD = { ok: false, status: 400, error: 'La solicitud no es válida.' } as const
const TOO_BIG_CODE = {
  ok: false,
  status: 413,
  error: `El código es muy largo para el Sensei: el máximo es ${MAX_CODE} caracteres. Recorta lo que no sea parte de la pregunta.`,
} as const

// A declared size over the limit is refused before the body is read into memory.
export async function readRequest(request: Request): Promise<ParseResult<Record<string, unknown>>> {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) {
    return { ok: false, status: 413, error: 'La solicitud es demasiado grande.' }
  }
  return readBody(await request.text())
}

// The raw body: too large → 413 before JSON.parse ever runs.
export function readBody(text: string): ParseResult<Record<string, unknown>> {
  if (text.length > MAX_BODY) {
    return { ok: false, status: 413, error: 'La solicitud es demasiado grande.' }
  }
  try {
    const data: unknown = JSON.parse(text)
    return isObject(data) ? { ok: true, value: data } : BAD
  } catch {
    return BAD
  }
}

function readCode(v: unknown): ParseResult<string> {
  if (typeof v !== 'string' || v.trim() === '') return BAD
  return v.length > MAX_CODE ? TOO_BIG_CODE : { ok: true, value: v }
}

const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max

function readFailing(v: unknown): string[] | null {
  return Array.isArray(v) && v.length <= 20 && v.every((m) => isText(m, 400)) ? v : null
}

function readChecks(v: unknown): CheckResult[] | null {
  if (!Array.isArray(v) || v.length > 20) return null
  const out: CheckResult[] = []
  for (const c of v) {
    if (!isObject(c) || !isText(c.type, 40) || typeof c.pass !== 'boolean') return null
    if (!isText(c.message, 400)) return null
    out.push({ type: c.type, pass: c.pass, message: c.message })
  }
  return out
}

const ID = /^M\d{2}-(T\d{2}-K\d|BOSS)$/

export function parseHint(body: Record<string, unknown>): ParseResult<HintRequest> {
  if (body.context === 'kata') {
    if (typeof body.kataId !== 'string' || !ID.test(body.kataId)) return BAD
    const code = readCode(body.code)
    const failing = readFailing(body.failing)
    if (!code.ok) return code
    if (failing === null) return BAD
    return {
      ok: true,
      value: { context: 'kata', kataId: body.kataId, code: code.value, failing },
    }
  }
  if (body.context !== 'question' || !isObject(body.question)) return BAD
  const q = body.question
  const input = readInput(q.input)
  const answer = readAnswer(q.answer)
  if (typeof q.prompt !== 'string' || q.prompt.length > 500 || typeof q.skill !== 'string')
    return BAD
  if (input === null || answer === null) return BAD
  return {
    ok: true,
    value: {
      context: 'question',
      question: { prompt: q.prompt, input, skill: q.skill, answer },
      response: body.response === undefined ? null : readResponse(body.response),
    },
  }
}

export function parseReview(body: Record<string, unknown>): ParseResult<ReviewRequest> {
  if (typeof body.bossId !== 'string' || !/^M\d{2}-BOSS$/.test(body.bossId)) return BAD
  const code = readCode(body.code)
  if (!code.ok) return code
  const checks = readChecks(body.checks)
  if (checks === null || !isText(body.summary, 4000)) return BAD
  return {
    ok: true,
    value: { bossId: body.bossId, code: code.value, checks, summary: body.summary },
  }
}

export function parseExplain(body: Record<string, unknown>): ParseResult<{ code: string }> {
  const code = readCode(body.code)
  return code.ok ? { ok: true, value: { code: code.value } } : code
}

export interface ExplainResult {
  overview: string
  lines: { line: number; text: string }[]
}
