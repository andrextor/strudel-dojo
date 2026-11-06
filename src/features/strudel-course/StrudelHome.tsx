import { ArrowRight, Lock, Swords } from 'lucide-preact'
import { buttonClass } from '../../components/ui/button.ts'
import ProgressBar from '../../components/ui/ProgressBar.tsx'
import StatusBadge from '../../components/ui/StatusBadge.tsx'
import { bossHref, stageHref, unitHref } from '../curriculum/paths.ts'
import type { Module, StageOutline } from '../curriculum/schema.ts'
import NeedProfile from '../profiles/NeedProfile.tsx'
import { isStagePassed, recommendedStrudel, stageStatus } from '../progress/rules.ts'
import { useProgress } from '../progress/use-progress.ts'
import { STAGE_STATUS } from './labels.ts'
import TheoryGate from './TheoryGate.tsx'

interface Props {
  stages: StageOutline[]
  curriculum: Module[]
}

export default function StrudelHome({ stages, curriculum }: Props) {
  const { active, progress } = useProgress()
  if (active === null || progress === null) return <NeedProfile />

  const next = recommendedStrudel(progress, curriculum, stages)
  const stage = next && stages.find((s) => s.id === next.stageId)
  const unit =
    next && next.kind !== 'boss' ? stage?.units.find((u) => u.id === next.unitId) : undefined
  const passed = stages.filter((s) => isStagePassed(progress, s)).length

  return (
    <div class="space-y-8">
      <header class="space-y-3">
        <h1 class="font-display text-3xl font-bold md:text-4xl">Curso Strudel</h1>
        <p class="max-w-2xl text-dojo-muted">
          Doce etapas, de tu primer golpe a una pieza en vivo. Ritmo y sonido no piden teoría; desde
          ahí, cada unidad usa lo que aprendiste en el curso de teoría.
        </p>
        <div class="max-w-md">
          <ProgressBar value={passed} max={stages.length} label="Etapas aprobadas" />
        </div>
      </header>

      {next && stage && (
        <section class="space-y-3 rounded-card bg-dojo-surface p-5 md:p-6">
          <p class="text-sm text-dojo-muted">Continuar · {stage.title}</p>
          <p class="font-display text-2xl font-bold">
            {next.kind === 'boss' ? `Combate: ${stage.boss.title}` : unit?.title}
          </p>
          {next.kind === 'theory' ? (
            <TheoryGate topicIds={next.topicIds} curriculum={curriculum} progress={progress} />
          ) : (
            <a
              href={next.kind === 'boss' ? bossHref(stage.id) : unitHref(next.unitId)}
              class={buttonClass('primary')}
            >
              {next.kind === 'boss' ? (
                <Swords size={18} aria-hidden="true" />
              ) : (
                <ArrowRight size={18} aria-hidden="true" />
              )}
              {next.kind === 'boss' ? 'Ir al combate' : 'Continuar'}
            </a>
          )}
        </section>
      )}

      <ol class="space-y-2">
        {stages.map((s) => {
          const status = stageStatus(progress, stages, s)
          const body = (
            <>
              <span class="font-display text-2xl font-bold text-dojo-muted">{s.order}</span>
              <span class="min-w-0 flex-1">
                <span class="block font-semibold">{s.title}</span>
                <span class="block text-sm text-dojo-muted">{s.summary}</span>
              </span>
              {status === 'locked' ? (
                <Lock size={18} class="shrink-0 text-dojo-muted" aria-hidden="true" />
              ) : (
                <StatusBadge {...STAGE_STATUS[status]} />
              )}
            </>
          )
          const row = 'flex items-center gap-3 rounded-card border-2 border-dojo-hairline p-4'
          return (
            <li key={s.id}>
              {status === 'locked' ? (
                <div class={`${row} opacity-40`}>{body}</div>
              ) : (
                <a href={stageHref(s.id)} class={`${row} bg-dojo-surface hover:border-dojo-neon`}>
                  {body}
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
