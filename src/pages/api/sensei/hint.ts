import { betaJSONSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/beta/json-schema'
import type { APIRoute } from 'astro'
import { findKata } from '../../../features/curriculum/index.ts'
import { formatResponse } from '../../../features/exercises/format.ts'
import { type HintRequest, parseHint, readRequest } from '../../../features/sensei/contracts.ts'
import { revealsAnswer } from '../../../features/sensei/hint-guard.ts'
import { HINT_SYSTEM, numbered } from '../../../features/sensei/prompts.ts'
import { runKata } from '../../../features/strudel/assertions.ts'
import { claudeClient, claudeError, HINT_MODEL, json, NO_KEY } from '../../../lib/claude.ts'
import { allow } from '../../../lib/rate-limit.ts'

export const prerender = false

const SCHEMA = {
  type: 'object',
  properties: { hint: { type: 'string', description: 'One or two sentences, never the answer.' } },
  required: ['hint'],
  additionalProperties: false,
} as const

const RETRY = 'No pude preparar una pista. Intenta de nuevo.'

// The answer key stays on the server: it only feeds the guard, never the model.
function describeQuestion(req: Extract<HintRequest, { context: 'question' }>): string {
  const { question, response } = req
  const options =
    question.input.kind === 'choice' || question.input.kind === 'rhythm'
      ? `\nOptions: ${question.input.options.join(' | ')}`
      : ''
  const tried = response ? formatResponse(question, response, 'latin') : null
  return `<question>${question.prompt}${options}</question>\n${tried ? `<answer_so_far>${tried}</answer_so_far>` : 'I have not answered yet.'}`
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!allow(`hint:${clientAddress}`, 60, 60 * 60 * 1000)) {
    return json({ error: 'Pediste muchas pistas en esta hora. Intenta más tarde.' }, 429)
  }
  const body = await readRequest(request)
  if (!body.ok) return json({ error: body.error }, body.status)
  const parsed = parseHint(body.value)
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status)
  const client = claudeClient()
  if (!client) return NO_KEY()
  const req = parsed.value

  let content: string
  if (req.context === 'kata') {
    const kata = await findKata(req.kataId)
    if (kata === null) return json({ error: 'Esa kata no existe.' }, 404)
    const result = await runKata(req.code, kata.assertions, kata.cycles)
    const failing = result.ok
      ? result.results.filter((r) => !r.pass).map((r) => r.message)
      : [`The code does not run: ${result.error.message}`]
    if (failing.length === 0) return json({ hint: 'Tu código ya cumple todo. ¡Pruébalo y sigue!' })
    content = `<brief>${kata.brief}</brief>\n<failing>\n${failing.join('\n')}\n</failing>\n<code>\n${numbered(req.code)}\n</code>`
  } else {
    content = describeQuestion(req)
  }

  try {
    const response = await client.beta.messages.parse({
      model: HINT_MODEL,
      max_tokens: 16000,
      system: HINT_SYSTEM,
      output_config: { effort: 'medium', format: betaJSONSchemaOutputFormat(SCHEMA) },
      messages: [{ role: 'user', content }],
    })
    const hint = response.parsed_output?.hint.trim()
    if (response.stop_reason === 'refusal' || !hint) return json({ error: RETRY }, 422)
    if (req.context === 'question' && revealsAnswer(hint, req.question)) {
      return json(
        { error: 'La pista que salió daba la respuesta, así que no te la mostramos. Pide otra.' },
        422,
      )
    }
    return json({ hint })
  } catch (error) {
    return claudeError(error)
  }
}
