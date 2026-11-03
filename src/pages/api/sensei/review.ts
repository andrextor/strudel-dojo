import { betaJSONSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/beta/json-schema'
import type { APIRoute } from 'astro'
import { getCurriculum } from '../../../features/curriculum/index.ts'
import { SKILL_NAME_ES } from '../../../features/curriculum/skills.ts'
import { rubricScore } from '../../../features/progress/rules.ts'
import { parseReview, readRequest } from '../../../features/sensei/contracts.ts'
import { numbered, REVIEW_SYSTEM } from '../../../features/sensei/prompts.ts'
import type { SenseiReview } from '../../../features/sensei/types.ts'
import {
  claudeClient,
  claudeError,
  fallbackParams,
  json,
  NO_KEY,
  REVIEW_MODEL,
} from '../../../lib/claude.ts'
import { allow } from '../../../lib/rate-limit.ts'

export const prerender = false

const RETRY = 'El Sensei no pudo terminar la revisión. Intenta de nuevo.'

function schema(ids: string[]) {
  return {
    type: 'object',
    properties: {
      criteria: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', enum: ids },
            score: { type: 'integer', description: '0 to 10' },
            comment: { type: 'string' },
          },
          required: ['id', 'score', 'comment'],
          additionalProperties: false,
        },
        description: 'Exactly one entry per rubric criterion.',
      },
      strengths: { type: 'array', items: { type: 'string' }, description: '1 to 3 items' },
      nextSteps: { type: 'array', items: { type: 'string' }, description: '1 to 3 items' },
      variation: {
        type: 'object',
        properties: { idea: { type: 'string' }, code: { type: 'string' } },
        required: ['idea', 'code'],
        additionalProperties: false,
      },
    },
    required: ['criteria', 'strengths', 'nextSteps', 'variation'],
    additionalProperties: false,
  } as const
}

const clean = (items: string[]) =>
  items
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!allow(`review:${clientAddress}`, 10, 60 * 60 * 1000)) {
    return json({ error: 'Ya pediste muchas revisiones en esta hora. Intenta más tarde.' }, 429)
  }
  const body = await readRequest(request)
  if (!body.ok) return json({ error: body.error }, body.status)
  const parsed = parseReview(body.value)
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status)
  const client = claudeClient()
  if (!client) return NO_KEY()
  const { bossId, code, checks, summary } = parsed.value

  const module = (await getCurriculum()).find((m) => m.status === 'ready' && m.boss.id === bossId)
  if (module === undefined || module.status !== 'ready') {
    return json({ error: 'Ese combate no existe.' }, 404)
  }
  const { boss } = module
  // ponytail: the checks come from the browser (running user code on the server is remote code
  // execution). Progress is local anyway, so a forged pass only fools its own profile.
  if (checks.length !== boss.assertions.length) return json({ error: RETRY }, 400)
  const skills = [...new Set(module.topics.flatMap((t) => t.skills))].map(
    (s) => SKILL_NAME_ES[s] ?? s,
  )
  const ids = boss.rubric.map((c) => c.id)

  const content = `<brief>Belt: ${module.title}. Skills: ${skills.join(', ')}.
Boss: ${boss.title}. ${boss.brief}
Rubric (id: criterion, weight): ${boss.rubric.map((c) => `${c.id}: ${c.label} (${c.weight})`).join('; ')}
Automatic checks: ${checks.map((r) => `${r.pass ? 'PASS' : 'FAIL'} ${r.message}`).join(' | ')}
What it plays over ${boss.cycles} cycles: ${summary}</brief>
<code>
${numbered(code)}
</code>`

  try {
    const response = await client.beta.messages.parse({
      model: REVIEW_MODEL,
      max_tokens: 4096,
      ...fallbackParams(),
      system: REVIEW_SYSTEM,
      output_config: { effort: 'medium', format: betaJSONSchemaOutputFormat(schema(ids)) },
      messages: [{ role: 'user', content }],
    })
    const out = response.parsed_output
    if (response.stop_reason === 'refusal' || !out) return json({ error: RETRY }, 422)

    const byId = new Map(out.criteria.map((c) => [c.id, c]))
    if (ids.some((id) => !byId.has(id))) return json({ error: RETRY }, 422)
    const criteria = boss.rubric.map((c) => {
      const got = byId.get(c.id)
      return {
        id: c.id,
        score: Math.min(10, Math.max(0, Math.round(got?.score ?? 0))),
        comment: got?.comment.trim() ?? '',
      }
    })
    // The final score is the weighted rubric, computed here: the model cannot pass anyone.
    const { score, passed: rubricPassed } = rubricScore(
      boss.rubric,
      Object.fromEntries(criteria.map((c) => [c.id, c.score])),
      boss.passScore,
    )
    const review: SenseiReview = {
      criteria,
      score,
      strengths: clean(out.strengths),
      nextSteps: clean(out.nextSteps),
      variation: { idea: out.variation.idea.trim(), code: out.variation.code.trim() },
    }
    return json({
      review,
      assertions: checks,
      passed: checks.every((c) => c.pass) && rubricPassed,
    })
  } catch (error) {
    return claudeError(error)
  }
}
