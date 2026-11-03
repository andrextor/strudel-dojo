// One-off: translates the @strudel/reference descriptions to Spanish with Claude and writes
// src/features/strudel/ref-es.json (committed; the app never calls Claude for this).
// Run: node --env-file=.env scripts/translate-reference.mjs [--force]
// Without --force only names missing from the file are translated, so reruns are cheap.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'
import { betaJSONSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/beta/json-schema'
import { reference } from '@strudel/reference'

const OUT = new URL('../src/features/strudel/ref-es.json', import.meta.url)
const MODEL = 'claude-haiku-5-5' // short, mechanical translation: the cheapest model is enough
const BATCH = 25
const PARALLEL = 4

// The package's HTML to plain text, keeping code as `backticks` so the app can style it.
export function plain(html) {
  return html
    .replace(/\{@link\s+(?:[\w.]+#)?([\w$]+)\}/g, '`$1`')
    .replace(/<code>([\s\S]*?)<\/code>/g, '`$1`')
    .replace(/<a [^>]*>([\s\S]*?)<\/a>/g, '$1')
    .replace(/<\/p>\s*<p>/g, '¶')
    .replace(/<br\s*\/?>/g, '¶')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/ ?¶ ?/g, '\n\n')
    .trim()
}

const SYSTEM = `You translate the reference documentation of Strudel (a live-coding music language) from English into neutral Spanish for learners of music theory and live coding.

Rules:
- Keep everything inside backticks exactly as it is (function names, code, mini-notation, note names like c4).
- Keep function names unchanged even outside backticks.
- Use these terms: pattern → patrón, cycle → ciclo, sample → sample, step → paso, event → evento, mini-notation → mini-notation, scale → escala, chord → acorde, voicing → voicing, note → nota.
- Address the reader as "tú". Be faithful and concise; do not add explanations.
- Keep paragraph breaks (blank lines).`

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, es: { type: 'string' } },
        required: ['name', 'es'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
}

async function translate(client, batch) {
  const content = batch.map((d) => `<doc name="${d.name}">\n${d.text}\n</doc>`).join('\n')
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: 'low', format: betaJSONSchemaOutputFormat(SCHEMA) },
    messages: [
      {
        role: 'user',
        content: `Translate each doc. Return one item per doc, same name.\n\n${content}`,
      },
    ],
  })
  if (response.stop_reason === 'refusal' || !response.parsed_output) return []
  const wanted = new Set(batch.map((d) => d.name))
  return response.parsed_output.items.filter((i) => wanted.has(i.name) && i.es.trim() !== '')
}

async function main() {
  const force = process.argv.includes('--force')
  const done = !force && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
  const seen = new Set()
  const todo = reference.docs
    .filter(
      (d) => typeof d.name === 'string' && d.description && !seen.has(d.name) && seen.add(d.name),
    )
    .map((d) => ({ name: d.name, text: plain(d.description) }))
    .filter((d) => d.text !== '' && !done[d.name])
  console.log(`${todo.length} to translate, ${Object.keys(done).length} already done`)

  const client = new Anthropic()
  const batches = []
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH))
  let next = 0
  async function worker() {
    while (next < batches.length) {
      const batch = batches[next++]
      for (let attempt = 0; attempt < 2; attempt++) {
        const items = await translate(client, batch)
        for (const { name, es } of items) done[name] = es.trim()
        if (batch.every((d) => done[d.name])) break
      }
      process.stdout.write('.')
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker))
  const sorted = Object.fromEntries(Object.entries(done).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(OUT, `${JSON.stringify(sorted, null, 2)}\n`)
  const missing = todo.filter((d) => !done[d.name]).map((d) => d.name)
  console.log(
    `\n${Object.keys(sorted).length} translated${missing.length ? `; missing: ${missing.join(', ')}` : ''}`,
  )
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
