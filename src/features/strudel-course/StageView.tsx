import { ArrowLeft, ArrowRight, Lock, Swords, Target } from 'lucide-preact'
import { buttonClass } from '../../components/ui/button.ts'
import ProgressBar from '../../components/ui/ProgressBar.tsx'
import StatusBadge from '../../components/ui/StatusBadge.tsx'
import { bossHref, unitHref } from '../curriculum/paths.ts'
import type { Module, Stage } from '../curriculum/schema.ts'
import NeedProfile from '../profiles/NeedProfile.tsx'
import {
  isBossPassed,
  isStageUnlocked,
  isUnitPassed,
  kataStatus,
  stageBossUnlocked,
  unitStatus,
} from '../progress/rules.ts'
import { useProgress } from '../progress/use-progress.ts'
import { UNIT_STATUS } from './labels.ts'

interface Props {
  stage: Stage
  stages: Stage[]
  curriculum: Module[]
}

export default function StageView({ stage, stages, curriculum }: Props) {
  const { active, progress } = useProgress()
  if (active === null || progress === null) return <NeedProfile />

  const back = (
    <a
      href="/strudel"
      class="inline-flex items-center gap-2 text-sm text-dojo-muted hover:text-dojo-neon"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Curso Strudel
    </a>
  )
  const header = (
    <header class="space-y-3">
      {back}
      <p class="text-sm text-dojo-muted">Etapa {stage.order}</p>
      <h1 class="font-display text-3xl font-bold md:text-4xl">{stage.title}</h1>
      <p class="max-w-2xl text-dojo-muted">{stage.summary}</p>
    </header>
  )
  if (!isStageUnlocked(progress, stages, stage)) {
    return (
      <div class="space-y-6">
        {header}
        <p class="flex items-center gap-2 rounded-card bg-dojo-surface p-5">
          <Lock size={18} aria-hidden="true" />
          Esta etapa se abre cuando apruebas la anterior.
        </p>
      </div>
    )
  }

  const unitsDone = stage.units.filter((u) => isUnitPassed(progress, u)).length
  const bossOpen = stageBossUnlocked(progress, stages, stage)
  const bossPassed = isBossPassed(progress, stage.boss.id)

  return (
    <div class="space-y-8">
      {header}
      <div class="max-w-md">
        <ProgressBar value={unitsDone} max={stage.units.length} label="Unidades aprobadas" />
      </div>

      <ol class="space-y-3">
        {stage.units.map((u, i) => {
          const done = u.katas.filter((k) => kataStatus(progress, k.id) === 'passed').length
          return (
            <li key={u.id}>
              <a
                href={unitHref(u.id)}
                class="flex flex-col gap-3 rounded-card border-2 border-dojo-hairline bg-dojo-surface p-4 hover:border-dojo-neon sm:flex-row sm:items-center"
              >
                <span class="font-display text-2xl font-bold text-dojo-muted">{i + 1}</span>
                <span class="min-w-0 flex-1">
                  <span class="block font-semibold">{u.title}</span>
                  <span class="block text-sm text-dojo-muted">{u.goal}</span>
                  <span class="mt-1 inline-flex items-center gap-1 text-sm text-dojo-muted">
                    <Target size={14} aria-hidden="true" />
                    Katas {done}/{u.katas.length}
                  </span>
                </span>
                <StatusBadge {...UNIT_STATUS[unitStatus(progress, curriculum, stages, stage, u)]} />
              </a>
            </li>
          )
        })}
      </ol>

      <section class="space-y-3 rounded-card bg-dojo-surface p-5 md:p-6">
        <h2 class="flex items-center gap-2 font-display text-xl font-bold">
          <Swords size={20} aria-hidden="true" />
          Combate: {stage.boss.title}
        </h2>
        <p class="text-dojo-muted">{stage.boss.brief}</p>
        {bossPassed && <StatusBadge status="passed" label="Combate aprobado" />}
        {bossOpen ? (
          <a href={bossHref(stage.id)} class={buttonClass(bossPassed ? 'ghost' : 'primary')}>
            {bossPassed ? 'Volver a combatir' : 'Ir al combate'}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        ) : (
          !bossPassed && (
            <StatusBadge status="locked" label="Aprueba las unidades para desbloquearlo" />
          )
        )}
      </section>
    </div>
  )
}
