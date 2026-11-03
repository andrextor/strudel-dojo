import { betaJSONSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/beta/json-schema'
import type { APIRoute } from 'astro'
import {
  type ExplainResult,
  parseExplain,
  readRequest,
} from '../../../features/sensei/contracts.ts'
import { EXPLAIN_SYSTEM, numbered } from '../../../features/sensei/prompts.ts'
import { claudeClient, claudeError, EXPLAIN_MODEL, json, NO_KEY } from '../../../lib/claude.ts'
import { allow } from '../../../lib/rate-limit.ts'

export const prerender = false

const SCHEMA = {
  type: 'object',
  properties: {
    overview: { type: 'string' },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: { line: { type: 'integer' }, text: { type: 'string' } },
        required: ['line', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['overview', 'lines'],
  additionalProperties: false,
} as const

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!allow(`explain:${clientAddress}`, 30, 60 * 60 * 1000)) {
    return json({ error: 'Pediste muchas explicaciones en esta hora. Intenta más tarde.' }, 429)
  }
  const body = await readRequest(request)
  if (!body.ok) return json({ error: body.error }, body.status)
  const parsed = parseExplain(body.value)
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status)
  const client = claudeClient()
  if (!client) return NO_KEY()
  const { code } = parsed.value
  const lineCount = code.split('\n').length

  try {
    const response = await client.beta.messages.parse({
      model: EXPLAIN_MODEL,
      max_tokens: 16000,
      system: EXPLAIN_SYSTEM,
      output_config: { effort: 'low', format: betaJSONSchemaOutputFormat(SCHEMA) },
      messages: [{ role: 'user', content: `<code>\n${numbered(code)}\n</code>` }],
    })
    const out = response.parsed_output
    if (response.stop_reason === 'refusal' || !out || out.overview.trim() === '') {
      return json({ error: 'El Sensei no pudo explicar este código. Intenta de nuevo.' }, 422)
    }
    const result: ExplainResult = {
      overview: out.overview.trim(),
      lines: out.lines
        .filter((l) => l.line >= 1 && l.line <= lineCount && l.text.trim() !== '')
        .map((l) => ({ line: l.line, text: l.text.trim() })),
    }
    return json(result)
  } catch (error) {
    return claudeError(error)
  }
}
