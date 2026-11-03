// Code → Pattern, in Node and in the browser. Strudel is imported lazily so no page pays for
// it until something evaluates. No DOM, no audio.
import { toDojoError } from './errors.ts'
import type { DojoError, PatternLike } from './types.ts'

type Evaluate = (code: string) => Promise<{ pattern: unknown }>

let ready: Promise<Evaluate> | null = null

// Registers core + mini + tonal as the global scope once. The browser engine may add
// webaudio/draw on top; evaluation keeps working with whatever is registered.
export function loadScope(): Promise<Evaluate> {
  ready ??= (async () => {
    const [core, mini, tonal, { transpiler }] = await Promise.all([
      import('@strudel/core'),
      import('@strudel/mini'),
      import('@strudel/tonal'),
      import('@strudel/transpiler'),
    ])
    await core.evalScope(core, mini, tonal)
    const proto = core.Pattern.prototype
    // `$: x` transpiles to `x.p('$')`, which only a running repl collects; outside one, collect
    // them here and stack them, so the checks hear every `$:` line (`_$:` stays muted).
    return async (code: string) => {
      const collected: unknown[] = []
      const previous = proto.p
      proto.p = function (id: unknown) {
        const muted = typeof id === 'string' && (id.startsWith('_') || id.endsWith('_'))
        if (!muted) collected.push(this)
        return muted ? core.silence : this
      }
      try {
        const result = await core.evaluate(code, transpiler)
        return collected.length > 0 ? { pattern: core.stack(...collected) } : result
      } finally {
        if (previous) proto.p = previous
        else delete proto.p
      }
    }
  })()
  return ready
}

let names: Promise<string[]> | null = null

// Function names for "did you mean" hints; only loaded when an error needs them.
export function knownNames(): Promise<string[]> {
  names ??= import('@strudel/reference').then(({ reference }) => [
    ...new Set(reference.docs.flatMap((d) => (typeof d.name === 'string' ? [d.name] : []))),
  ])
  return names
}

export const isPattern = (v: unknown): v is PatternLike =>
  typeof v === 'object' && v !== null && 'queryArc' in v && typeof v.queryArc === 'function'

export type EvalResult = { ok: true; pattern: PatternLike } | { ok: false; error: DojoError }

export async function evaluatePattern(code: string): Promise<EvalResult> {
  const evaluate = await loadScope()
  try {
    const { pattern } = await evaluate(code)
    if (!isPattern(pattern)) {
      return {
        ok: false,
        error: {
          message: 'El código no produce un patrón: termina con algo como `note("c e g")`.',
          line: null,
          raw: String(pattern),
        },
      }
    }
    return { ok: true, pattern }
  } catch (err) {
    return { ok: false, error: toDojoError(err, code, await knownNames()) }
  }
}
