import { Square, Users } from 'lucide-preact'
import BeltBadge from '../../components/ui/BeltBadge.tsx'
import StreakBadge from '../../components/ui/StreakBadge.tsx'
import XpCounter from '../../components/ui/XpCounter.tsx'
import type { Module } from '../curriculum/schema.ts'
import { setActive } from '../profiles/profiles.ts'
import { beltFor, totalXp } from '../progress/points.ts'
import { streak } from '../progress/streak.ts'
import { useProgress } from '../progress/use-progress.ts'
import { hushAll } from '../strudel/engine.ts'
import { syncConfigured } from '../sync/client.ts'
import SyncBadge from '../sync/SyncBadge.tsx'

// Same height as the static fallback in BaseLayout, so nothing jumps when it hydrates.
export default function AppHeader({ curriculum }: { curriculum: Module[] }) {
  const { active, progress, storageFailed, updateProfiles } = useProgress()

  const stop = (
    <button
      type="button"
      class="inline-flex size-10 items-center justify-center rounded-control border border-dojo-hairline text-dojo-muted hover:border-dojo-torii hover:text-dojo-torii"
      onClick={hushAll}
      title="Parar todo (Esc)"
    >
      <Square size={18} aria-hidden="true" />
      <span class="sr-only">Parar todo (Esc)</span>
    </button>
  )

  if (active === null || progress === null) {
    return (
      <div class="flex h-11 items-center gap-2">
        {syncConfigured && <SyncBadge />}
        {stop}
      </div>
    )
  }
  const rank = beltFor(progress, curriculum)
  const days = streak(progress, new Date())

  return (
    <div class="flex h-11 items-center gap-3 md:gap-5">
      {storageFailed && (
        <p role="alert" class="hidden text-sm text-dojo-warning md:block">
          No se está guardando el progreso en este navegador.
        </p>
      )}
      <span class="hidden lg:inline-flex">
        {rank.next ? (
          <BeltBadge belt={rank.next.belt} stripes={rank.next.stripes} showName={false} />
        ) : (
          rank.belt && <BeltBadge belt={rank.belt} stripes={4} showName={false} />
        )}
      </span>
      <span class="hidden sm:inline-flex">
        <XpCounter xp={totalXp(progress, curriculum)} />
      </span>
      <span class="hidden sm:inline-flex">
        <StreakBadge days={days} short />
      </span>
      {syncConfigured && <SyncBadge />}
      <a
        href="/progreso"
        class="max-w-28 truncate font-semibold text-dojo-text hover:text-dojo-neon"
        title="Tu progreso"
      >
        {active.name}
      </a>
      <button
        type="button"
        class="inline-flex size-10 items-center justify-center rounded-control border border-dojo-hairline text-dojo-muted hover:border-dojo-neon hover:text-dojo-neon"
        title="Cambiar de perfil"
        onClick={() => {
          updateProfiles((s) => setActive(s, null))
          location.href = '/'
        }}
      >
        <Users size={18} aria-hidden="true" />
        <span class="sr-only">Cambiar de perfil</span>
      </button>
      {stop}
    </div>
  )
}
