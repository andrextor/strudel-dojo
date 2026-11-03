import { ANTHROPIC_API_KEY } from 'astro:env/server'
import Anthropic from '@anthropic-ai/sdk'

/** Hints are asked on every question and kata, the highest volume of all: the cheapest model. */
export const HINT_MODEL = 'claude-haiku-5-5'
/** Explanations are short and frequent in the Dojo, so they use the cheapest model too. */
export const EXPLAIN_MODEL = 'claude-haiku-5-5'
/** A boss review grades a whole piece against a rubric: worth a stronger (still mid-price) model. */
export const REVIEW_MODEL = 'claude-sonnet-5-5'

/**
 * Server-side fallback: if a safety classifier declines, the API retries on its recommended model.
 * Sonnet 5.5 accepts it on the Claude API; Haiku 5.5 has no server-side fallback.
 */
export function fallbackParams(): { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: 'default' } {
  return { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }
}

let client: Anthropic | null = null

/** Null when the key is not configured; callers answer 503 and the rest of the app keeps working. */
export function claudeClient(): Anthropic | null {
  if (!ANTHROPIC_API_KEY) return null
  client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY, timeout: 120_000 })
  return client
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export const NO_KEY = () => json({ error: 'El Sensei no está activado en este dojo.' }, 503)

/** Maps SDK failures to messages the student can act on; upstream details never reach the browser. */
export function claudeError(error: unknown): Response {
  if (error instanceof Anthropic.RateLimitError) {
    return json(
      { error: 'El Sensei está atendiendo a mucha gente. Intenta de nuevo en un minuto.' },
      429,
    )
  }
  if (error instanceof Anthropic.AuthenticationError) {
    console.error('Anthropic authentication failed: check ANTHROPIC_API_KEY')
    return json({ error: 'El Sensei no está bien configurado.' }, 503)
  }
  if (error instanceof Anthropic.BadRequestError) {
    console.error('Anthropic rejected the request:', error.message)
    return json({ error: 'El Sensei no pudo leer esto. Prueba con otro código.' }, 400)
  }
  console.error('Anthropic request failed:', error)
  return json({ error: 'No se pudo hablar con el Sensei. Intenta de nuevo.' }, 502)
}
