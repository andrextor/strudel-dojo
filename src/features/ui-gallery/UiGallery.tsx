// Temporary showcase of every P06 component in every state (/ui). Removed in P07.
import { useState } from 'preact/hooks'
import Fretboard from '../../components/music/Fretboard.tsx'
import type { KeyState, Pick } from '../../components/music/instrument.tsx'
import Keyboard from '../../components/music/Keyboard.tsx'
import NoteName from '../../components/music/NoteName.tsx'
import Staff from '../../components/music/Staff.tsx'
import BeltBadge from '../../components/ui/BeltBadge.tsx'
import Callout from '../../components/ui/Callout.tsx'
import ProgressBar from '../../components/ui/ProgressBar.tsx'
import StatusBadge, { type Status } from '../../components/ui/StatusBadge.tsx'
import StreakBadge from '../../components/ui/StreakBadge.tsx'
import Tabs from '../../components/ui/Tabs.tsx'
import XpCounter from '../../components/ui/XpCounter.tsx'
import { BELTS } from '../curriculum/belts.ts'
import QuestionCard from '../exercises/QuestionCard.tsx'
import { generateQuestion } from '../exercises/registry.ts'
import type { Question } from '../exercises/types.ts'
import { DEFAULT_PREFS } from '../progress/persist.ts'
import type { Prefs } from '../progress/types.ts'

const STATUSES: Status[] = ['passed', 'review', 'failed', 'in-progress', 'not-started', 'locked']

const KEY_STATES = new Map<string, KeyState>([
  ['60', 'active'],
  ['62', 'selected'],
  ['64', 'correct'],
  ['66', 'wrong'],
])
const FRET_STATES = new Map<string, KeyState>([
  ['0:3', 'active'],
  ['1:2', 'selected'],
  ['2:2', 'correct'],
  ['3:0', 'wrong'],
])

const gen = (generator: string, params: Record<string, unknown>, seed: string) =>
  generateQuestion({ generator, params, weight: 1 }, seed, new Set())

const scaleD: Question = {
  ...gen('scale-spelling', { scales: ['major'], tonics: ['D'] }, 'ui:scale'),
  input: {
    kind: 'note-set',
    via: ['keyboard', 'fretboard', 'text', 'midi'],
    ordered: true,
    count: 7,
  },
}

const triad: Question = {
  id: 'ui:triad',
  key: 'ui:triad',
  generator: 'chord-spelling',
  skill: 'triad-quality',
  prompt: 'Toca el acorde de Do mayor (en cualquier inversión).',
  input: { kind: 'note-set', via: ['midi', 'keyboard', 'text'], ordered: false, count: 3 },
  answer: { kind: 'pitch-classes', notes: ['C', 'E', 'G'], spelling: 'enharmonic' },
  explanation: 'Do mayor: Do, Mi y Sol (fundamental, tercera mayor y quinta justa).',
}

const QUESTIONS: { title: string; question: Question }[] = [
  { title: 'Escala con deletreo estricto', question: scaleD },
  { title: 'Acorde por MIDI', question: triad },
  { title: 'Nota marcada', question: gen('note-name', { accidentals: 'all' }, 'ui:note') },
  {
    title: 'Oído: intervalo',
    question: gen('ear-interval', { set: ['3M', '5P', '8P'], direction: 'up' }, 'ui:ear'),
  },
  { title: 'Ritmo', question: gen('rhythm-match', {}, 'ui:rhythm') },
  {
    title: 'Texto: intervalo',
    question: gen('interval-name', {}, 'ui:int'),
  },
  {
    title: 'Pentagrama',
    question: {
      ...gen('note-name', { accidentals: 'none' }, 'ui:staff'),
      marked: [],
      prompt: '¿Qué nota es?',
      staff: 'X:1\nL:1/4\nK:C\nc4|]',
      answer: { kind: 'pitch-classes', notes: ['C'], spelling: 'enharmonic' },
      explanation: 'Es Do: el tercer espacio de la clave de sol.',
    },
  },
]

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <section class="space-y-4">
      <h2 class="font-display text-2xl font-bold">{title}</h2>
      {children}
    </section>
  )
}

export default function UiGallery() {
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS })
  const [picks, setPicks] = useState<Pick[]>([])
  const [tab, setTab] = useState<'uno' | 'dos' | 'tres'>('uno')
  const [round, setRound] = useState(0)
  const patch = (p: Partial<Prefs>) => setPrefs((prev) => ({ ...prev, ...p }))
  const toggle = (pick: Pick) =>
    setPicks((prev) =>
      prev.some((p) => p.at === pick.at) ? prev.filter((p) => p.at !== pick.at) : [...prev, pick],
    )
  const selected = new Map(picks.map((p) => [p.at, 'selected' as const]))

  return (
    <div class="space-y-12">
      <fieldset class="flex flex-wrap gap-4 rounded-card bg-dojo-surface p-4 text-sm">
        <legend class="sr-only">Preferencias de prueba</legend>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            checked={prefs.notation === 'american'}
            onChange={(e) => patch({ notation: e.currentTarget.checked ? 'american' : 'latin' })}
          />
          Notación americana
        </label>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            checked={prefs.instrument === 'fretboard'}
            onChange={(e) =>
              patch({ instrument: e.currentTarget.checked ? 'fretboard' : 'keyboard' })
            }
          />
          Prefiero diapasón
        </label>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            checked={prefs.lefty}
            onChange={(e) => patch({ lefty: e.currentTarget.checked })}
          />
          Zurdo
        </label>
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            checked={prefs.sound}
            onChange={(e) => patch({ sound: e.currentTarget.checked })}
          />
          Sonido al tocar
        </label>
        <span class="text-dojo-muted">Última entrada: {prefs.via ?? 'ninguna'}</span>
      </fieldset>

      <Section title="Teclado">
        <Keyboard
          mode="display"
          notation={prefs.notation}
          labels="name"
          states={KEY_STATES}
          low={48}
          high={71}
          label="Estados: Do sonando, Re elegida, Mi correcta, Fa sostenido incorrecta"
        />
        <p class="text-sm text-dojo-muted">Elegir varias con deletreo en las negras:</p>
        <Keyboard
          mode="select-many"
          notation={prefs.notation}
          spelling="black"
          sound={prefs.sound}
          states={selected}
          onPick={toggle}
          labels="degree"
          tonic="D"
          label="Teclado de prueba"
        />
        <p class="text-sm">
          Elegidas:{' '}
          {picks.map((p) => (
            <span key={p.at} class="mr-2">
              <NoteName note={p.name} notation={prefs.notation} />
            </span>
          ))}
        </p>
        <p class="text-sm text-dojo-muted">Modo tocar (solo suena):</p>
        <Keyboard mode="play" notation={prefs.notation} labels="name" label="Teclado para tocar" />
      </Section>

      <Section title="Diapasón">
        <Fretboard
          mode="display"
          notation={prefs.notation}
          lefty={prefs.lefty}
          labels="name"
          states={FRET_STATES}
          label="Estados en el diapasón"
        />
        <Fretboard
          mode="select-many"
          notation={prefs.notation}
          lefty={prefs.lefty}
          spelling="black"
          sound={prefs.sound}
          states={selected}
          onPick={toggle}
          labels="name"
          label="Diapasón de prueba"
        />
      </Section>

      <Section title="Pentagrama">
        <div class="grid gap-4 md:grid-cols-2">
          <Staff abc={'X:1\nL:1/4\nK:D\nDEFG|ABcd|]'} label="Escala de Re mayor en clave de sol" />
          <Staff
            abc={'X:1\nL:1/4\nK:C clef=bass\nC,E,G,C|]'}
            label="Acorde de Do mayor en clave de fa"
          />
        </div>
        <p>
          NoteName: <NoteName note="C#4" notation={prefs.notation} />,{' '}
          <NoteName note="Bb" notation={prefs.notation} />,{' '}
          <NoteName note="F##" notation={prefs.notation} />
        </p>
      </Section>

      <Section title="Tarjetas de pregunta">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {QUESTIONS.map(({ title, question }, i) => (
            <div key={`${question.id}:${round}`} class="space-y-2">
              <h3 class="font-semibold text-dojo-muted">{title}</h3>
              <QuestionCard
                question={question}
                mode={i === QUESTIONS.length - 1 ? 'test' : 'practice'}
                prefs={prefs}
                onPrefs={patch}
                onAnswer={() => {}}
                onNext={() => setRound((r) => r + 1)}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="UI">
        <div class="flex flex-col gap-3">
          {BELTS.map((belt, i) => (
            <BeltBadge key={belt} belt={belt} stripes={i % 5} />
          ))}
        </div>
        <div class="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
        <div class="max-w-sm space-y-3">
          <ProgressBar value={3} max={4} label="Temas aprobados" />
          <ProgressBar value={0} max={10} label="Preguntas" />
        </div>
        <div class="flex flex-wrap gap-6">
          <XpCounter xp={1250} />
          <StreakBadge days={1} />
          <StreakBadge days={7} />
          <StreakBadge days={0} />
        </div>
        <Tabs
          label="Ejemplo de pestañas"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'uno', label: 'Práctica' },
            { id: 'dos', label: 'Prueba' },
            { id: 'tres', label: 'Katas' },
          ]}
        >
          <p>Panel {tab}</p>
        </Tabs>
        <div class="grid gap-3 md:grid-cols-2">
          <Callout tone="info" title="Dato">
            Una octava son 12 semitonos.
          </Callout>
          <Callout tone="hint" title="Pista">
            Cuenta los semitonos desde la tónica.
          </Callout>
          <Callout tone="sensei" title="Sensei">
            Prueba con <code class="font-mono">.slow(2)</code>.
          </Callout>
          <Callout tone="warning" title="Cuidado">
            En Re mayor se escribe F♯, no G♭.
          </Callout>
        </div>
      </Section>
    </div>
  )
}
