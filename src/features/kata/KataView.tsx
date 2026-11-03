import { ArrowLeft, Eye, Lightbulb, Lock } from 'lucide-preact'
import { useRef, useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import Callout from '../../components/ui/Callout.tsx'
import StatusBadge from '../../components/ui/StatusBadge.tsx'
import { moduleHref, topicHref } from '../curriculum/paths.ts'
import type { Kata, Module } from '../curriculum/schema.ts'
import NeedProfile from '../profiles/NeedProfile.tsx'
import {
  canSeeSolution,
  markSolutionSeen,
  recordKata,
  SOLUTION_AFTER_FAILS,
  topicStatus,
} from '../progress/rules.ts'
import { useProgress } from '../progress/use-progress.ts'
import { useSenseiEnabled } from '../sensei/client.ts'
import SenseiHint from '../sensei/SenseiHint.tsx'
import { runKata } from '../strudel/assertions.ts'
import StrudelEditor, { type EditorApi } from '../strudel/StrudelEditor.tsx'
import { AssertionList, useAssertions } from './challenge.tsx'

interface Props {
  kata: Kata
  topicId: string
  module: Module
  curriculum: Module[]
}

export default function KataView({ kata, topicId, module, curriculum }: Props) {
  const { active, progress, updateProgress } = useProgress()
  const { check, test } = useAssertions(kata.assertions, kata.cycles)
  const [hints, setHints] = useState(0)
  const lastCode = useRef('')
  const editor = useRef<EditorApi | null>(null)
  const sensei = useSenseiEnabled()
  const topic = module.topics.find((t) => t.id === topicId)
  if (active === null || progress === null) return <NeedProfile />
  if (topic === undefined || topicStatus(progress, curriculum, module, topic) === 'locked') {
    return (
      <section class="space-y-3 rounded-card bg-dojo-surface p-5 md:p-6">
        <p class="flex items-center gap-2">
          <Lock size={18} aria-hidden="true" />
          Esta kata está bloqueada.
        </p>
        <a href={moduleHref(module.id)} class={buttonClass('secondary')}>
          Ver el módulo
        </a>
      </section>
    )
  }

  const record = progress.katas[kata.id]
  const passed = record?.passedAt != null
  const fails = record && !passed ? record.attempts : 0
  const allHints = kata.hints ?? []

  async function evaluate() {
    const code = editor.current?.getCode() || lastCode.current
    if (code.trim() === '') return
    const result = await test(code)
    const ok = result.state === 'done' && result.passed
    updateProgress((p) => recordKata(p, kata.id, code, ok, new Date()))
  }

  return (
    <div class="space-y-6">
      <a
        href={`${topicHref(topicId)}#katas`}
        class="inline-flex items-center gap-2 text-sm text-dojo-muted hover:text-dojo-neon"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {topic.title}
      </a>
      <header class="space-y-2">
        <h1 class="font-display text-2xl font-bold md:text-3xl">{kata.title}</h1>
        <p class="text-lg">{kata.brief}</p>
        {passed && (
          <StatusBadge status="passed" label={record?.helped ? 'Aprobada con ayuda' : 'Aprobada'} />
        )}
      </header>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <StrudelEditor
          initialCode={record?.code || kata.starter}
          playLabel="Probar el código"
          onReady={(api) => {
            editor.current = api
          }}
          onCodeChange={(code) => {
            lastCode.current = code
          }}
          onEvaluate={() => void evaluate()}
        />
        <aside class="space-y-4">
          <section class="space-y-2 rounded-card bg-dojo-surface p-4">
            <h2 class="font-semibold">Requisitos</h2>
            <AssertionList check={check} count={kata.assertions.length} />
          </section>

          {allHints.length > 0 && (
            <section class="space-y-2">
              {allHints.slice(0, hints).map((h) => (
                <Callout key={h} tone="hint" title="Pista">
                  {h}
                </Callout>
              ))}
              {hints < allHints.length && (
                <button
                  type="button"
                  class={buttonClass('ghost')}
                  onClick={() => setHints(hints + 1)}
                >
                  <Lightbulb size={18} aria-hidden="true" />
                  {hints === 0 ? 'Ver una pista' : 'Otra pista'}
                </button>
              )}
            </section>
          )}

          {sensei && !passed && (
            <SenseiHint
              body={async () => {
                const code = editor.current?.getCode() || lastCode.current || kata.starter
                const r = await runKata(code, kata.assertions, kata.cycles)
                const failing = r.ok
                  ? r.results.filter((x) => !x.pass).map((x) => x.message)
                  : [`The code does not run: ${r.error.message}`]
                return { context: 'kata', kataId: kata.id, code, failing }
              }}
            />
          )}

          {!passed && (
            <section class="space-y-2">
              {record?.solutionSeen ? (
                <div class="space-y-2">
                  <p class="text-sm text-dojo-muted">
                    Escríbela tú (no se puede pegar desde aquí con un clic). Al aprobar, la kata
                    queda «con ayuda» y no da XP de kata.
                  </p>
                  <pre class="overflow-x-auto rounded-control bg-dojo-raised p-3 font-mono text-sm text-dojo-violet">
                    {kata.solution}
                  </pre>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    class={buttonClass('secondary')}
                    disabled={!canSeeSolution(progress, kata.id)}
                    onClick={() => updateProgress((p) => markSolutionSeen(p, kata.id))}
                  >
                    <Eye size={18} aria-hidden="true" />
                    Ver solución
                  </button>
                  {!canSeeSolution(progress, kata.id) && (
                    <p class="text-sm text-dojo-muted">
                      Se habilita tras {SOLUTION_AFTER_FAILS} intentos fallidos ({fails} de{' '}
                      {SOLUTION_AFTER_FAILS}).
                    </p>
                  )}
                </>
              )}
            </section>
          )}

          {passed && (
            <a href={`${topicHref(topicId)}#katas`} class={buttonClass('primary')}>
              Volver al tema
            </a>
          )}
        </aside>
      </div>
    </div>
  )
}
