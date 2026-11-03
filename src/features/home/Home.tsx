import {
  ArrowRight,
  Download,
  Ear,
  Lock,
  Repeat,
  Swords,
  Terminal,
  TrendingUp,
} from 'lucide-preact'
import BeltBadge from '../../components/ui/BeltBadge.tsx'
import { buttonClass } from '../../components/ui/button.ts'
import StatusBadge, { type Status } from '../../components/ui/StatusBadge.tsx'
import { bossHref, moduleHref, topicHref } from '../curriculum/paths.ts'
import type { Module } from '../curriculum/schema.ts'
import ProfilePicker from '../profiles/ProfilePicker.tsx'
import { needsBackupReminder } from '../progress/persist.ts'
import { isTopicPassed, moduleStatus, recommendedNext } from '../progress/rules.ts'
import type { ModuleStatus } from '../progress/types.ts'
import { useProgress } from '../progress/use-progress.ts'
import { dueSkills, reviewMixes } from '../review/schedule.ts'

const MODULE_STATUS: Record<ModuleStatus, { status: Status; label: string }> = {
  locked: { status: 'locked', label: 'Bloqueado' },
  available: { status: 'in-progress', label: 'Disponible' },
  boss_ready: { status: 'in-progress', label: 'Combate listo' },
  passed: { status: 'passed', label: 'Aprobado' },
  draft: { status: 'not-started', label: 'Próximamente' },
}

const SHORTCUTS = [
  { href: '/repaso', label: 'Repaso', Icon: Repeat },
  { href: '/oido', label: 'Oído', Icon: Ear },
  { href: '/dojo', label: 'Dojo libre', Icon: Terminal },
  { href: '/progreso', label: 'Progreso', Icon: TrendingUp },
]

export default function Home({ curriculum }: { curriculum: Module[] }) {
  const { active, progress } = useProgress()
  if (active === null || progress === null) return <ProfilePicker />

  const now = new Date()
  const due = dueSkills(progress.skillStats, new Set(reviewMixes(progress, curriculum).keys()), now)
  const remindBackup = needsBackupReminder(progress, now)
  const next = recommendedNext(progress, curriculum)
  const nextModule = next && curriculum.find((m) => m.id === next.moduleId)
  const nextTopic =
    next?.kind === 'topic' ? nextModule?.topics.find((t) => t.id === next.topicId) : undefined

  return (
    <div class="space-y-10">
      <section class="enter space-y-2">
        <h1 class="font-display text-3xl font-bold md:text-4xl">Hola, {active.name}</h1>
        <p class="text-dojo-muted">Un cinturón por módulo; cada tema aprobado suma una raya.</p>
      </section>

      {next && nextModule && (
        <section class="enter rounded-card bg-dojo-surface p-5 md:p-6" style="--i: 1">
          <p class="text-sm text-dojo-muted">Continuar · {nextModule.title}</p>
          <p class="mt-1 font-display text-2xl font-bold">
            {next.kind === 'boss'
              ? `Combate: ${nextModule.status === 'ready' ? nextModule.boss.title : ''}`
              : nextTopic?.title}
          </p>
          {nextTopic && <p class="mt-1 text-dojo-muted">{nextTopic.goal}</p>}
          <a
            href={next.kind === 'boss' ? bossHref(next.moduleId) : topicHref(next.topicId)}
            class={buttonClass('primary', 'mt-4')}
          >
            {next.kind === 'boss' ? (
              <Swords size={18} aria-hidden="true" />
            ) : (
              <ArrowRight size={18} aria-hidden="true" />
            )}
            {next.kind === 'boss' ? 'Ir al combate' : 'Continuar'}
          </a>
        </section>
      )}
      {next === null && (
        <section class="rounded-card bg-dojo-surface p-5 md:p-6">
          <p class="font-display text-2xl font-bold">Aprobaste todo lo disponible.</p>
          <p class="text-dojo-muted">
            Los próximos cinturones llegan pronto. Mientras, al Dojo libre.
          </p>
        </section>
      )}

      {(due.length > 0 || remindBackup) && (
        <div class="enter grid gap-3 md:grid-cols-2" style="--i: 2">
          {due.length > 0 && (
            <a
              href="/repaso"
              class="flex min-h-16 items-center gap-3 rounded-card border-2 border-dojo-gold bg-dojo-surface px-5 py-3 hover:border-dojo-neon"
            >
              <Repeat size={22} class="shrink-0 text-dojo-gold" aria-hidden="true" />
              <span>
                <span class="block font-semibold">
                  {due.length === 1
                    ? '1 habilidad para repasar hoy'
                    : `${due.length} habilidades para repasar hoy`}
                </span>
                <span class="block text-sm text-dojo-muted">
                  Diez preguntas, empezando por lo que más te cuesta.
                </span>
              </span>
            </a>
          )}
          {remindBackup && (
            <a
              href="/progreso"
              class="flex min-h-16 items-center gap-3 rounded-card border-2 border-dojo-hairline bg-dojo-surface px-5 py-3 hover:border-dojo-neon"
            >
              <Download size={22} class="shrink-0 text-dojo-muted" aria-hidden="true" />
              <span>
                <span class="block font-semibold">Haz un respaldo de tu progreso</span>
                <span class="block text-sm text-dojo-muted">
                  Solo vive en este navegador. Descárgalo o cópialo en Progreso.
                </span>
              </span>
            </a>
          )}
        </div>
      )}

      <section class="enter space-y-4" style="--i: 3">
        <h2 class="font-display text-2xl font-bold">Camino de cinturones</h2>
        <ol class="space-y-2">
          {curriculum.map((m) => {
            const status = moduleStatus(progress, curriculum, m)
            const stripes = m.topics.filter((t) => isTopicPassed(progress, m, t)).length
            const open = status !== 'locked' && status !== 'draft'
            const current = next?.moduleId === m.id
            const body = (
              <>
                <BeltBadge belt={m.belt} stripes={stripes} showName={false} />
                <span class="min-w-0 flex-1">
                  <span class="block font-semibold">{m.title}</span>
                  <span class="block truncate text-sm text-dojo-muted">{m.summary}</span>
                </span>
                {status === 'locked' ? (
                  <Lock size={18} class="shrink-0 text-dojo-muted" aria-label="Bloqueado" />
                ) : (
                  <>
                    <span class="hidden shrink-0 sm:inline-flex">
                      <StatusBadge {...MODULE_STATUS[status]} />
                    </span>
                    <span class="sr-only sm:hidden">{MODULE_STATUS[status].label}</span>
                  </>
                )}
              </>
            )
            const row = `flex items-center gap-4 rounded-card border-2 p-4 ${current ? 'border-dojo-torii shadow-glow-torii' : 'border-dojo-hairline'} ${open ? 'bg-dojo-surface hover:border-dojo-neon' : 'opacity-40'}`
            return (
              <li key={m.id}>
                {open ? (
                  <a href={moduleHref(m.id)} class={row}>
                    {body}
                  </a>
                ) : (
                  <div class={row}>{body}</div>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <section class="enter grid grid-cols-2 gap-3 md:grid-cols-4" style="--i: 4">
        {SHORTCUTS.map(({ href, label, Icon }) => (
          <a
            key={href}
            href={href}
            class="flex min-h-16 items-center gap-3 rounded-card bg-dojo-surface px-4 font-semibold hover:text-dojo-neon"
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </a>
        ))}
      </section>
    </div>
  )
}
