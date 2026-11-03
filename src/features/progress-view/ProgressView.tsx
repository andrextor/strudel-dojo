import { Download, Trash2, UserPlus } from 'lucide-preact'
import { useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import ProgressBar from '../../components/ui/ProgressBar.tsx'
import StreakBadge from '../../components/ui/StreakBadge.tsx'
import XpCounter from '../../components/ui/XpCounter.tsx'
import { resultHref } from '../curriculum/paths.ts'
import type { Module } from '../curriculum/schema.ts'
import { SKILL_NAME_ES } from '../curriculum/skills.ts'
import { midiSupport } from '../midi/midi.ts'
import { PROFILE_DOT } from '../profiles/ProfilePicker.tsx'
import { removeProfile, setActive } from '../profiles/profiles.ts'
import { totalXp } from '../progress/points.ts'
import { percentOf } from '../progress/rules.ts'
import { loadProgress } from '../progress/store.ts'
import { streak } from '../progress/streak.ts'
import type { Prefs } from '../progress/types.ts'
import { useProgress } from '../progress/use-progress.ts'
import BackupPanel, { downloadBackup } from './BackupPanel.tsx'

function Choice<T extends string>(props: {
  legend: string
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <fieldset class="space-y-2">
      <legend class="text-sm text-dojo-muted">{props.legend}</legend>
      <div class="flex flex-wrap gap-2">
        {props.options.map((o) => (
          <label
            key={o.id}
            class={`flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 ${props.value === o.id ? 'border-dojo-neon text-dojo-neon' : 'border-dojo-hairline'}`}
          >
            <input
              type="radio"
              class="sr-only"
              checked={props.value === o.id}
              onChange={() => props.onChange(o.id)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Toggle(props: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  note?: string
}) {
  return (
    <label class="flex items-start gap-3">
      <input
        type="checkbox"
        class="mt-1 size-5 accent-dojo-neon"
        checked={props.checked}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
      <span>
        {props.label}
        {props.note && <span class="block text-sm text-dojo-muted">{props.note}</span>}
      </span>
    </label>
  )
}

export default function ProgressView({ curriculum }: { curriculum: Module[] }) {
  const { active, progress, profiles, updateProgress, updateProfiles } = useProgress()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [typed, setTyped] = useState('')

  if (active === null || progress === null) {
    return (
      <div class="space-y-6">
        <h1 class="font-display text-3xl font-bold">Progreso</h1>
        <p>
          No hay un perfil activo.{' '}
          <a href="/" class="text-dojo-neon underline">
            Elige uno
          </a>{' '}
          o restaura un respaldo:
        </p>
        <BackupPanel />
      </div>
    )
  }

  const prefs = progress.prefs
  const setPrefs = (patch: Partial<Prefs>) =>
    updateProgress((p) => ({ ...p, prefs: { ...p.prefs, ...patch } }))
  const midi = midiSupport()
  const scopeTitle = (scopeId: string) =>
    curriculum.flatMap((m) => [m, ...m.topics]).find((x) => x.id === scopeId)?.title ?? scopeId
  const attempts = progress.attempts
    .filter((a) => a.submittedAt !== null)
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
  const skills = Object.entries(progress.skillStats).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div class="space-y-8">
      <header class="space-y-3">
        <h1 class="font-display text-3xl font-bold">Progreso de {active.name}</h1>
        <div class="flex flex-wrap gap-6">
          <XpCounter xp={totalXp(progress, curriculum)} />
          <StreakBadge days={streak(progress, new Date())} />
        </div>
      </header>

      <section class="space-y-4 rounded-card bg-dojo-surface p-5 md:p-6">
        <h2 class="font-display text-xl font-bold">Habilidades</h2>
        {skills.length === 0 ? (
          <p class="text-dojo-muted">Todavía no hay respuestas. Practica un tema para empezar.</p>
        ) : (
          <ul class="grid gap-4 md:grid-cols-2">
            {skills.map(([skill, s]) => {
              const total = s.correct + s.wrong
              return (
                <li key={skill} class="space-y-1">
                  <ProgressBar
                    value={s.correct}
                    max={total}
                    label={SKILL_NAME_ES[skill] ?? skill}
                    showValue={false}
                  />
                  <p class="text-sm text-dojo-muted">
                    {percentOf(s.correct, total)} % de {total} · caja {s.box} de 5
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section class="space-y-3 rounded-card bg-dojo-surface p-5 md:p-6">
        <h2 class="font-display text-xl font-bold">Historial de pruebas</h2>
        {attempts.length === 0 ? (
          <p class="text-dojo-muted">Aún no entregas ninguna prueba.</p>
        ) : (
          <ul class="divide-y divide-dojo-hairline">
            {attempts.map((a) => (
              <li key={a.id}>
                <a
                  href={resultHref(a.id)}
                  class="flex flex-wrap justify-between gap-2 py-2 hover:text-dojo-neon"
                >
                  <span>
                    {a.kind === 'placement' ? 'Ubicación · ' : ''}
                    {scopeTitle(a.scopeId)}
                  </span>
                  <span class="text-dojo-muted">
                    {a.correct}/{a.questions.length} · {a.passed ? 'aprobada' : 'no aprobada'} ·{' '}
                    {new Date(a.submittedAt ?? '').toLocaleDateString('es')}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section class="space-y-4 rounded-card bg-dojo-surface p-5 md:p-6">
        <h2 class="font-display text-xl font-bold">Preferencias</h2>
        <Choice
          legend="Notación"
          value={prefs.notation}
          options={[
            { id: 'latin', label: 'Latina (Do Re Mi)' },
            { id: 'american', label: 'Americana (C D E)' },
          ]}
          onChange={(notation) => setPrefs({ notation })}
        />
        <Choice
          legend="Instrumento"
          value={prefs.instrument}
          options={[
            { id: 'keyboard', label: 'Teclado' },
            { id: 'fretboard', label: 'Guitarra' },
          ]}
          onChange={(instrument) => setPrefs({ instrument })}
        />
        <Toggle
          label="Diapasón para zurdos"
          checked={prefs.lefty}
          onChange={(lefty) => setPrefs({ lefty })}
        />
        <Toggle
          label="Sonido al tocar el teclado y el diapasón"
          checked={prefs.sound}
          onChange={(sound) => setPrefs({ sound })}
        />
        {midi.supported ? (
          <Toggle
            label="Usar mi teclado MIDI"
            note="Las preguntas que lo admiten muestran la pestaña MIDI."
            checked={prefs.midi}
            onChange={(v) => setPrefs({ midi: v })}
          />
        ) : (
          <p class="text-sm text-dojo-muted">MIDI: {midi.reason}</p>
        )}
      </section>

      <BackupPanel />

      <section class="space-y-4 rounded-card bg-dojo-surface p-5 md:p-6">
        <h2 class="font-display text-xl font-bold">Perfiles</h2>
        <ul class="space-y-3">
          {profiles.profiles.map((p) => (
            <li key={p.id} class="space-y-3">
              <div class="flex flex-wrap items-center gap-3">
                <span class={`size-5 rounded-full ${PROFILE_DOT[p.color]}`} aria-hidden="true" />
                <span class="font-semibold">{p.name}</span>
                {p.id === active.id ? (
                  <span class="text-sm text-dojo-muted">(activo)</span>
                ) : (
                  <button
                    type="button"
                    class={buttonClass('ghost', 'min-h-11')}
                    onClick={() => updateProfiles((s) => setActive(s, p.id))}
                  >
                    Usar este perfil
                  </button>
                )}
                <button
                  type="button"
                  class={buttonClass('ghost', 'ml-auto min-h-11 text-dojo-danger')}
                  onClick={() => {
                    setDeleting(p.id)
                    setTyped('')
                  }}
                >
                  <Trash2 size={18} aria-hidden="true" />
                  Borrar
                </button>
              </div>
              {deleting === p.id && (
                <div class="space-y-3 rounded-card bg-dojo-danger-bg p-4" role="alert">
                  <p>
                    Esto borra el progreso de <strong>{p.name}</strong> en este navegador. Antes,
                    descarga su respaldo si lo quieres conservar.
                  </p>
                  <button
                    type="button"
                    class={buttonClass('secondary')}
                    onClick={() => downloadBackup(p, loadProgress(p.id))}
                  >
                    <Download size={18} aria-hidden="true" />
                    Descargar respaldo de {p.name}
                  </button>
                  <label class="block space-y-1">
                    <span class="text-sm">Escribe «{p.name}» para confirmar</span>
                    <input
                      type="text"
                      autocomplete="off"
                      value={typed}
                      onInput={(e) => setTyped(e.currentTarget.value)}
                      class="min-h-12 w-full rounded-control border-2 border-dojo-border bg-dojo-ink px-4 text-base"
                    />
                  </label>
                  <div class="flex flex-wrap gap-3">
                    <button
                      type="button"
                      class={buttonClass('primary')}
                      disabled={typed.trim() !== p.name}
                      onClick={() => {
                        updateProfiles((s) => removeProfile(s, p.id))
                        setDeleting(null)
                        if (p.id === active.id) location.href = '/'
                      }}
                    >
                      Borrar definitivamente
                    </button>
                    <button
                      type="button"
                      class={buttonClass('secondary')}
                      onClick={() => setDeleting(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          class={buttonClass('secondary')}
          onClick={() => {
            updateProfiles((s) => setActive(s, null))
            location.href = '/'
          }}
        >
          <UserPlus size={18} aria-hidden="true" />
          Nuevo perfil
        </button>
      </section>
    </div>
  )
}
