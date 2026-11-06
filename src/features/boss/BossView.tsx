import { ArrowLeft, LoaderCircle, Lock, Sparkles, Swords } from 'lucide-preact'
import { useRef, useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import StatusBadge from '../../components/ui/StatusBadge.tsx'
import { moduleHref } from '../curriculum/paths.ts'
import type { Module } from '../curriculum/schema.ts'
import { AssertionList, useAssertions } from '../kata/challenge.tsx'
import NeedProfile from '../profiles/NeedProfile.tsx'
import { bossUnlocked, newlyPassedModule, recordBoss, rubricScore } from '../progress/rules.ts'
import type { BossRecord } from '../progress/types.ts'
import { useProgress } from '../progress/use-progress.ts'
import { askReview, useSenseiEnabled } from '../sensei/client.ts'
import { runKata } from '../strudel/assertions.ts'
import { summarize } from '../strudel/query.ts'
import StrudelEditor, { type EditorApi } from '../strudel/StrudelEditor.tsx'
import EarnedBelt from './EarnedBelt.tsx'
import ReviewCard from './ReviewCard.tsx'

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
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const sensei = useSenseiEnabled()
  const [earned, setEarned] = useState<Module | null>(null)

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
  const win = history.find((r) => r.passed)
  const lastReview = [...history].reverse().find((r) => r.review !== null)?.review ?? null
  const preview = rubricScore(boss.rubric, values, boss.passScore)

  function save(record: BossRecord) {
    updateProgress((p) => {
      const next = recordBoss(p, boss.id, record)
      setEarned(newlyPassedModule(p, next, curriculum))
      return next
    })
  }

  async function submit() {
    const code = editor.current?.getCode() ?? lastCode.current
    setBusy(true)
    const result = await test(code)
    setBusy(false)
    const assertionsOk = result.state === 'done' && result.passed
    const { score, passed: rubricOk } = rubricScore(boss.rubric, values, boss.passScore)
    const passed = assertionsOk && rubricOk
    save({
      submittedAt: new Date().toISOString(),
      code,
      assertions: result.state === 'done' ? result.results : [],
      review: null,
      selfAssessed: true,
      score,
      passed,
    })
    setMessage(
      passed
        ? '¡Combate aprobado! Ganaste el cinturón.'
        : !assertionsOk
          ? 'Todavía no cumple los requisitos de abajo. Ajusta el código y vuelve a entregar.'
          : `Tu puntaje (${score}) no llega a ${boss.passScore}. Mejora la pieza y vuelve a evaluarte.`,
    )
  }

  // The checks run here; the server computes the score from the rubric weights (spec 06).
  async function review() {
    const code = editor.current?.getCode() ?? lastCode.current
    setReviewing(true)
    setReviewError(null)
    const checks = await runKata(code, boss.assertions, boss.cycles)
    if (!checks.ok) {
      setReviewing(false)
      return setReviewError(`Tu código no corre: ${checks.error.message}`)
    }
    const summary = JSON.stringify(summarize(checks.events, boss.cycles))
    const r = await askReview(boss.id, code, checks.results, summary)
    setReviewing(false)
    if (!r.ok) return setReviewError(r.error)
    const { review: rv, assertions, passed } = r.data
    save({
      submittedAt: new Date().toISOString(),
      code,
      assertions,
      review: rv,
      selfAssessed: false,
      score: rv.score,
      passed,
    })
    setMessage(
      passed
        ? '¡Combate aprobado por el Sensei! Ganaste el cinturón.'
        : assertions.every((a) => a.pass)
          ? `El Sensei te dio ${rv.score}; se aprueba con ${boss.passScore}. Mira sus siguientes pasos.`
          : 'Todavía no cumple los requisitos. Ajusta el código y pide otra revisión.',
    )
  }

  const ceremonyCard = earned && (
    <EarnedBelt
      module={earned}
      curriculum={curriculum}
      onContinue={() => {
        location.href = '/'
      }}
    />
  )

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
        {win && (
          <StatusBadge
            status="passed"
            label={
              win.selfAssessed
                ? 'Combate aprobado (autoevaluado)'
                : 'Combate aprobado por el Sensei'
            }
          />
        )}
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
            {sensei && (
              <button
                type="button"
                class={buttonClass('secondary', 'w-full')}
                disabled={reviewing}
                onClick={() => void review()}
              >
                {reviewing ? (
                  <LoaderCircle size={18} class="motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles size={18} aria-hidden="true" />
                )}
                {reviewing ? 'El Sensei está revisando…' : 'Pedir revisión al Sensei'}
              </button>
            )}
            {reviewError && (
              <p role="alert" class="text-sm text-dojo-danger">
                {reviewError}
              </p>
            )}
            {message && (
              <p role="status" class="text-sm">
                {message}
              </p>
            )}
          </form>
        </aside>
      </div>

      {ceremonyCard}
      {lastReview && (
        <ReviewCard review={lastReview} rubric={boss.rubric} passScore={boss.passScore} />
      )}
    </div>
  )
}
