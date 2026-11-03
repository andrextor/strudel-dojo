// What katas and the boss share: running the assertions on the user's code and listing them.
import { CircleCheck, CircleX, LoaderCircle } from 'lucide-preact'
import { useRef, useState } from 'preact/hooks'
import InlineCode from '../../components/ui/InlineCode.tsx'
import type { Assertion } from '../curriculum/schema.ts'
import { runKata } from '../strudel/assertions.ts'
import type { DojoError } from '../strudel/types.ts'

export type Check =
  | { state: 'idle' }
  | { state: 'running' }
  | { state: 'error'; error: DojoError }
  | { state: 'done'; passed: boolean; results: { type: string; pass: boolean; message: string }[] }

export function useAssertions(assertions: Assertion[], cycles: number) {
  const [check, setCheck] = useState<Check>({ state: 'idle' })
  const run = useRef(0)

  // Last call wins: a slower earlier run never overwrites a newer result.
  async function test(code: string): Promise<Check> {
    const id = ++run.current
    setCheck({ state: 'running' })
    const r = await runKata(code, assertions, cycles)
    const next: Check = r.ok
      ? { state: 'done', passed: r.passed, results: r.results }
      : { state: 'error', error: r.error }
    if (id === run.current) setCheck(next)
    return next
  }
  return { check, test }
}

export function AssertionList({ check, count }: { check: Check; count: number }) {
  if (check.state === 'idle') {
    return (
      <p class="text-sm text-dojo-muted">
        Pulsa «Probar el código» (o {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter) para
        revisar los {count} requisitos.
      </p>
    )
  }
  if (check.state === 'running') {
    return (
      <p class="flex items-center gap-2 text-sm text-dojo-muted" role="status">
        <LoaderCircle size={16} class="motion-safe:animate-spin" aria-hidden="true" />
        Revisando…
      </p>
    )
  }
  if (check.state === 'error') {
    return (
      <p role="alert" class="text-sm text-dojo-danger">
        {check.error.message}
      </p>
    )
  }
  return (
    <ul class="space-y-2" aria-live="polite">
      {check.results.map((r, i) => (
        <li key={`${r.type}:${i}`} class="flex items-start gap-2">
          {r.pass ? (
            <CircleCheck size={18} class="mt-0.5 shrink-0 text-dojo-success" aria-label="Cumple" />
          ) : (
            <CircleX size={18} class="mt-0.5 shrink-0 text-dojo-danger" aria-label="Falta" />
          )}
          <span>
            <InlineCode text={r.message} />
          </span>
        </li>
      ))}
    </ul>
  )
}
