import { ArrowLeft, Lock, Sparkles, Swords } from 'lucide-preact'
import { useRef, useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import StatusBadge from '../../components/ui/StatusBadge.tsx'
import { moduleHref } from '../curriculum/paths.ts'
import type { Module } from '../curriculum/schema.ts'
import { AssertionList, useAssertions } from '../kata/challenge.tsx'
import NeedProfile from '../profiles/NeedProfile.tsx'
import { bossUnlocked, recordBoss, rubricScore } from '../progress/rules.ts'
import { useProgress } from '../progress/use-progress.ts'
import StrudelEditor, { type EditorApi } from '../strudel/StrudelEditor.tsx'

type ReadyModule = Extract<Module, { status: 'ready' }>

export default function BossView({
  module,
  curriculum,
}: {
  module: ReadyModule
  curriculum: Module[]
}) {
  const { boss } = module
  const { active, progress, updateProgress } = useProgress()
  const { check, test } = useAssertions(boss.assertions, boss.cycles)
  const editor = useRef<EditorApi | null>(null)
  const lastCode = useRef('')
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(boss.rubric.map((c) => [c.id, 5])),
  )
  const [honest, setHonest] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (active === null || progress === null) return <NeedProfile />
  const back = (
    <a
      href={moduleHref(module.id)}
      class="inline-flex items-center gap-2 text-sm text-dojo-muted hover:text-dojo-neon"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {module.title}
    </a>
  )
  if (!bossUnlocked(progress, curriculum, module)) {
    return (
      <section class="space-y-3">
        {back}
        <p class="flex items-center gap-2 rounded-card bg-dojo-surface p-5">
          <Lock size={18} aria-hidden="true" />
          El combate se abre cuando apruebas los 4 temas del módulo.
        </p>
      </section>
    )
  }

  const history = progress.bosses[boss.id] ?? []
  const won = history.some((r) => r.passed)
  const preview = rubricScore(boss.rubric, values, boss.passScore)

  async function submit() {
    const code = editor.current?.getCode() ?? lastCode.current
    setBusy(true)
    const result = await test(code)
    setBusy(false)
    const assertionsOk = result.state === 'done' && result.passed
    const { score, passed: rubricOk } = rubricScore(boss.rubric, values, boss.passScore)
    const passed = assertionsOk && rubricOk
    updateProgress((p) =>
      recordBoss(p, boss.id, {
        submittedAt: new Date().toISOString(),
        code,
        assertions: result.state === 'done' ? result.results : [],
        review: null,
        selfAssessed: true,
        score,
        passed,
      }),
    )
    setMessage(
      passed
        ? '¡Combate aprobado! Ganaste el cinturón.'
        : !assertionsOk
          ? 'Todavía no cumple los requisitos de abajo. Ajusta el código y vuelve a entregar.'
          : `Tu puntaje (${score}) no llega a ${boss.passScore}. Mejora la pieza y vuelve a evaluarte.`,
    )
  }

  return (
    <div class="space-y-6">
      {back}
      <header class="space-y-2">
        <p class="flex items-center gap-2 text-sm text-dojo-muted">
          <Swords size={16} aria-hidden="true" />
          Combate
        </p>
        <h1 class="font-display text-2xl font-bold md:text-3xl">{boss.title}</h1>
        <p class="text-lg">{boss.brief}</p>
        {won && <StatusBadge status="passed" label="Combate aprobado" />}
      </header>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <StrudelEditor
          initialCode={history.at(-1)?.code || boss.starter}
          playLabel="Probar el código"
          onReady={(api) => {
            editor.current = api
          }}
          onCodeChange={(code) => {
            lastCode.current = code
          }}
          onEvaluate={() => void test(lastCode.current)}
        />
        <aside class="space-y-4">
          <section class="space-y-2 rounded-card bg-dojo-surface p-4">
            <h2 class="font-semibold">Requisitos</h2>
            <AssertionList check={check} count={boss.assertions.length} />
          </section>

          <form
            class="space-y-4 rounded-card bg-dojo-surface p-4"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <h2 class="font-semibold">Autoevaluación</h2>
            <p class="text-sm text-dojo-muted">
              Escucha tu pieza y califica cada criterio de 0 a 10. Apruebas con {boss.passScore}.
            </p>
            {boss.rubric.map((c) => (
              <label key={c.id} class="block space-y-1">
                <span class="flex justify-between gap-2 text-sm">
                  <span>{c.label}</span>
                  <strong>{values[c.id]}</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={values[c.id]}
                  onInput={(e) => {
                    const v = Number(e.currentTarget.value)
                    setValues((prev) => ({ ...prev, [c.id]: v }))
                  }}
                  class="w-full accent-dojo-neon"
                />
              </label>
            ))}
            <p class="text-sm">
              Puntaje: <strong>{preview.score}</strong> de 10
            </p>
            <label class="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                class="mt-1 size-5 accent-dojo-neon"
                checked={honest}
                onChange={(e) => setHonest(e.currentTarget.checked)}
              />
              Me evalué con honestidad, como lo haría un sensei.
            </label>
            <button
              type="submit"
              class={buttonClass('primary', 'w-full')}
              disabled={!honest || busy}
            >
              Entregar combate
            </button>
            <button type="button" class={buttonClass('ghost', 'w-full')} disabled>
              <Sparkles size={18} aria-hidden="true" />
              El Sensei llega pronto
            </button>
            {message && (
              <p role="status" class="text-sm">
                {message}
              </p>
            )}
          </form>
        </aside>
      </div>
    </div>
  )
}
