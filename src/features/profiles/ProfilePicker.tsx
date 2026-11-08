import { Plus, UserRound } from 'lucide-preact'
import { useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import { freshRng } from '../../lib/random.ts'
import { BELT_NAME_ES, BELTS, type BeltColor } from '../curriculum/belts.ts'
import { useProgress } from '../progress/use-progress.ts'
import { syncConfigured } from '../sync/client.ts'
import SyncPanel from '../sync/SyncPanel.tsx'
import { createProfile, NAME_MAX, setActive } from './profiles.ts'

export const PROFILE_DOT: Record<BeltColor, string> = {
  white: 'bg-belt-white',
  yellow: 'bg-belt-yellow',
  orange: 'bg-belt-orange',
  green: 'bg-belt-green',
  blue: 'bg-belt-blue',
  purple: 'bg-belt-purple',
  brown: 'bg-belt-brown',
  red: 'bg-belt-red',
  black: 'bg-belt-black ring-2 ring-dojo-border',
  dan: 'bg-belt-dan',
}

const COLORS = BELTS.filter((b) => b !== 'white' && b !== 'dan')

// "¿Quién entrena hoy?": pick a profile or create one. Picking one makes it active.
export default function ProfilePicker() {
  const { profiles, updateProfiles } = useProgress()
  const [creating, setCreating] = useState(profiles.profiles.length === 0)
  const [name, setName] = useState('')
  const [color, setColor] = useState<BeltColor>('blue')
  const [error, setError] = useState<string | null>(null)

  function create(e: Event) {
    e.preventDefault()
    let failed: string | null = null
    updateProfiles((current) => {
      const result = createProfile(current, name, color, new Date(), freshRng())
      if (result.ok) return result.state
      failed = result.error
      return current
    })
    if (failed !== null) setError(failed)
  }

  return (
    <section class="mx-auto max-w-2xl space-y-6">
      <h1 class="font-display text-3xl font-bold md:text-4xl">¿Quién entrena hoy?</h1>
      {profiles.profiles.length > 0 && (
        <ul class="grid gap-3 sm:grid-cols-2">
          {profiles.profiles.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                class="flex min-h-16 w-full items-center gap-3 rounded-card border-2 border-dojo-border bg-dojo-surface px-5 text-left text-lg font-semibold hover:border-dojo-neon"
                onClick={() => updateProfiles((s) => setActive(s, p.id))}
              >
                <span
                  class={`size-6 shrink-0 rounded-full ${PROFILE_DOT[p.color]}`}
                  aria-hidden="true"
                />
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <form class="space-y-4 rounded-card bg-dojo-surface p-5 md:p-6" onSubmit={create}>
          <h2 class="font-display text-xl font-bold">Nuevo perfil</h2>
          <label class="block space-y-1">
            <span class="text-sm text-dojo-muted">Nombre</span>
            <input
              type="text"
              autocomplete="off"
              maxLength={NAME_MAX}
              value={name}
              onInput={(e) => {
                setName(e.currentTarget.value)
                setError(null)
              }}
              class="min-h-12 w-full rounded-control border-2 border-dojo-border bg-dojo-ink px-4 text-base"
            />
          </label>
          <fieldset class="space-y-2">
            <legend class="text-sm text-dojo-muted">Color</legend>
            <div class="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <label
                  key={c}
                  class={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-3 ${color === c ? 'border-dojo-neon' : 'border-dojo-hairline'}`}
                >
                  <input
                    type="radio"
                    name="color"
                    class="sr-only"
                    checked={color === c}
                    onChange={() => setColor(c)}
                  />
                  <span class={`size-5 rounded-full ${PROFILE_DOT[c]}`} aria-hidden="true" />
                  {BELT_NAME_ES[c]}
                </label>
              ))}
            </div>
          </fieldset>
          {error && (
            <p role="alert" class="text-sm text-dojo-danger">
              {error}
            </p>
          )}
          <button type="submit" class={buttonClass('primary')}>
            <UserRound size={18} aria-hidden="true" />
            Crear perfil y entrar
          </button>
        </form>
      ) : (
        <button type="button" class={buttonClass('secondary')} onClick={() => setCreating(true)}>
          <Plus size={18} aria-hidden="true" />
          Nuevo perfil
        </button>
      )}
      {syncConfigured ? (
        <SyncPanel entry />
      ) : (
        <p class="text-sm text-dojo-muted">
          Los perfiles y el progreso se guardan solo en este navegador. ¿Vienes de otro dispositivo?{' '}
          <a href="/progreso" class="text-dojo-neon underline">
            Restaura tu respaldo
          </a>
          .
        </p>
      )}
    </section>
  )
}
