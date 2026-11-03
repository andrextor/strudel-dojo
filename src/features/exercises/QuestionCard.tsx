import {
  ArrowRight,
  CircleCheck,
  CircleX,
  Guitar,
  Keyboard as KeyboardIcon,
  Music2,
  Piano,
  Play,
  Snail,
  Type,
  X,
} from 'lucide-preact'
import { useState } from 'preact/hooks'
import { Note } from 'tonal'
import Fretboard from '../../components/music/Fretboard.tsx'
import type { KeyState, Pick, Spelling } from '../../components/music/instrument.tsx'
import Keyboard from '../../components/music/Keyboard.tsx'
import NoteName from '../../components/music/NoteName.tsx'
import Staff from '../../components/music/Staff.tsx'
import { buttonClass } from '../../components/ui/button.ts'
import Callout from '../../components/ui/Callout.tsx'
import StatusBadge from '../../components/ui/StatusBadge.tsx'
import Tabs from '../../components/ui/Tabs.tsx'
import { midiSupport } from '../midi/midi.ts'
import { useMidi } from '../midi/use-midi.ts'
import type { Prefs } from '../progress/types.ts'
import { playOnce } from '../strudel/engine.ts'
import { fretToNote, STANDARD_TUNING, spellingsFor } from '../theory/instruments.ts'
import { parseNoteList, sameSound, sameSpelling } from '../theory/notes.ts'
import { grade } from './grade.ts'
import type { Answer, Grade, InputVia, Question, Response } from './types.ts'

interface Props {
  question: Question
  mode: 'practice' | 'test' // practice grades on the spot; test only records
  prefs: Prefs
  onPrefs?: (patch: Partial<Prefs>) => void
  onAnswer: (response: Response, grade: Grade) => void
  onNext?: () => void
}

const VIA_TABS = {
  keyboard: { label: 'Teclado', icon: <Piano size={16} aria-hidden="true" /> },
  fretboard: { label: 'Diapasón', icon: <Guitar size={16} aria-hidden="true" /> },
  text: { label: 'Texto', icon: <Type size={16} aria-hidden="true" /> },
  midi: { label: 'MIDI', icon: <KeyboardIcon size={16} aria-hidden="true" /> },
} as const

type PitchAnswer = Extract<Answer, { kind: 'pitch-classes' }>

// Enharmonic answers: the key names itself. Strict: black keys ask (C♯ / D♭), and every key
// asks when the exercise can need E♯, C♭ or doubles (set per exercise, never per question).
function spellingFor(input: Question['input'], answer: Answer): Spelling {
  if (answer.kind !== 'pitch-classes' || answer.spelling === 'enharmonic') return 'auto'
  return 'spellAll' in input && input.spellAll ? 'all' : 'black'
}

function pickVerdict(answer: PitchAnswer, picks: Pick[], ordered: boolean): KeyState[] {
  const same = answer.spelling === 'strict' ? sameSpelling : sameSound
  return picks.map((p, i) =>
    (ordered ? same(answer.notes[i] ?? '', p.name) : answer.notes.some((n) => same(n, p.name)))
      ? 'correct'
      : 'wrong',
  )
}

// Where a pitch sits on the fretboard: the lowest fret that plays exactly that note.
function fretOf(name: string): string | null {
  const midi = Note.midi(name)
  let best: [number, number] | null = null
  for (let s = 0; s < STANDARD_TUNING.length; s++) {
    for (let f = 0; f <= 15; f++) {
      const n = fretToNote(s, f)
      if (n !== null && Note.midi(n) === midi && (best === null || f < best[1])) best = [s, f]
    }
  }
  return best && `${best[0]}:${best[1]}`
}

function keyboardSpan(midis: number[]): { low: number; high: number } {
  const low = Math.min(48, ...midis.map((m) => m - (m % 12)))
  const high = Math.max(71, ...midis.map((m) => m - (m % 12) + 11))
  return { low, high }
}

function AudioControls({ code }: { code: string }) {
  const [played, setPlayed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = (options: { slow?: number; firstOnly?: boolean }) => {
    setPlayed(true)
    void playOnce(code, options).then((e) => setError(e?.message ?? null))
  }
  return (
    <div class="space-y-2">
      <div class="flex flex-wrap gap-2">
        <button type="button" class={buttonClass('primary')} onClick={() => run({})}>
          <Play size={18} aria-hidden="true" />
          {played ? 'Repetir' : 'Escuchar'}
        </button>
        <button type="button" class={buttonClass('secondary')} onClick={() => run({ slow: 2 })}>
          <Snail size={18} aria-hidden="true" />
          Más lento
        </button>
        <button
          type="button"
          class={buttonClass('secondary')}
          onClick={() => run({ firstOnly: true })}
        >
          <Music2 size={18} aria-hidden="true" />
          Primera nota
        </button>
      </div>
      {error && <p class="text-sm text-dojo-danger">{error}</p>}
    </div>
  )
}

export default function QuestionCard({ question, mode, prefs, onPrefs, onAnswer, onNext }: Props) {
  const { input, answer } = question
  const { notation } = prefs
  const isNotes = input.kind === 'note' || input.kind === 'note-set'
  const vias = isNotes
    ? input.via.filter((v) => v !== 'midi' || midiSupport().supported)
    : ([] as InputVia[])
  const [via, setVia] = useState<InputVia>(() => {
    if (prefs.via && vias.includes(prefs.via)) return prefs.via
    return vias.includes(prefs.instrument) ? prefs.instrument : (vias[0] ?? 'text')
  })
  const [choice, setChoice] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [picks, setPicks] = useState<Pick[]>([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Grade | null>(null)

  const done = result !== null
  const count = input.kind === 'note' ? 1 : input.kind === 'note-set' ? input.count : undefined
  const ordered = input.kind === 'note-set' ? input.ordered : true
  const showResult = done && mode === 'practice'

  function submit(response: Response) {
    const g = grade(question, response)
    setResult(g)
    onAnswer(response, g)
  }
  const submitPicks = (list: Pick[]) => submit({ kind: 'notes', notes: list.map((p) => p.name) })

  function onPick(pick: Pick) {
    setError(null)
    setPicks((prev) => {
      if (prev.some((p) => p.at === pick.at)) return prev.filter((p) => p.at !== pick.at)
      if (count === 1) return [pick]
      if (count !== undefined && prev.length >= count) return prev
      return [...prev, pick]
    })
  }

  // A chord answers a single note (its lowest), an unordered set (all of it) or adds to a
  // melody; the answer goes in as soon as it is complete.
  const midi = useMidi(via === 'midi' && !done, (notes) => {
    const chord = notes.map((m) => ({ midi: m, name: spellingsFor(m)[0] ?? '', at: String(m) }))
    if (count === 1) return submitPicks(chord.slice(0, 1))
    const next = ordered ? [...picks, ...chord] : chord
    setPicks(next)
    if (count === undefined ? !ordered : next.length >= count) submitPicks(next.slice(0, count))
  })

  function answerNow(e: Event) {
    e.preventDefault()
    if (done) return
    if (input.kind === 'choice' || input.kind === 'rhythm') {
      if (choice === null) return setError('Elige una opción.')
      return submit({ kind: 'choice', index: choice })
    }
    if (input.kind === 'text') {
      if (text.trim() === '') return setError('Escribe tu respuesta.')
      return submit({ kind: 'text', value: text })
    }
    if (via === 'text') {
      const parsed = parseNoteList(text)
      if (parsed === null) {
        return setError('No entendí alguna nota. Sepáralas con espacios, por ejemplo: re mi fa#')
      }
      return submit({ kind: 'notes', notes: parsed.map((p) => p.pitchClass) })
    }
    if (picks.length === 0) return setError('Elige al menos una nota.')
    submitPicks(picks)
  }

  function changeVia(next: InputVia) {
    setVia(next)
    setPicks([])
    setText('')
    setError(null)
    onPrefs?.({ via: next })
  }

  const verdicts =
    showResult && answer.kind === 'pitch-classes' ? pickVerdict(answer, picks, ordered) : null
  const states = new Map<string, KeyState>()
  if (via === 'midi') for (const m of midi.held) states.set(String(m), 'active')
  picks.forEach((p, i) => {
    states.set(p.at, verdicts?.[i] ?? 'selected')
  })
  const instrumentMode = done ? 'display' : count === 1 ? 'select-one' : 'select-many'
  const spelling = spellingFor(input, answer)
  const marked = question.marked ?? []

  return (
    <article class="min-w-0 space-y-5 rounded-card bg-dojo-surface p-5 md:p-6">
      <p class="text-xl font-semibold">{question.prompt}</p>

      {question.staff && <Staff abc={question.staff} label="Partitura de la pregunta" />}
      {question.audio && <AudioControls code={question.audio} />}
      {marked.length > 0 &&
        (prefs.instrument === 'fretboard' ? (
          <Fretboard
            mode="display"
            notation={notation}
            lefty={prefs.lefty}
            label="Diapasón con la nota marcada"
            states={
              new Map(
                marked.flatMap((n) => {
                  const at = fretOf(n)
                  return at ? [[at, 'active' as const]] : []
                }),
              )
            }
          />
        ) : (
          <Keyboard
            mode="display"
            notation={notation}
            label="Teclado con la nota marcada"
            {...keyboardSpan(marked.map((n) => Note.midi(n) ?? 60))}
            states={new Map(marked.map((n) => [String(Note.midi(n)), 'active' as const]))}
          />
        ))}

      <form class="space-y-4" onSubmit={answerNow}>
        {(input.kind === 'choice' || input.kind === 'rhythm') && (
          <fieldset class="grid gap-2 sm:grid-cols-2" disabled={done}>
            <legend class="sr-only">Opciones</legend>
            {input.options.map((option, i) => {
              const right = showResult && answer.kind === 'choice' && answer.index === i
              const wrong = showResult && choice === i && !right
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={choice === i}
                  class={`flex min-h-12 items-center justify-between gap-2 rounded-control border-2 px-4 py-2 text-left ${input.kind === 'rhythm' ? 'font-mono' : ''} ${right ? 'border-dojo-success bg-dojo-success-bg' : wrong ? 'border-dojo-danger bg-dojo-danger-bg' : choice === i ? 'border-dojo-violet bg-dojo-raised' : 'border-dojo-border hover:border-dojo-neon'}`}
                  onClick={() => {
                    setChoice(i)
                    setError(null)
                  }}
                >
                  {option}
                  {right && (
                    <CircleCheck size={18} class="text-dojo-success" aria-label="Correcta" />
                  )}
                  {wrong && (
                    <CircleX size={18} class="text-dojo-danger" aria-label="Tu respuesta" />
                  )}
                </button>
              )
            })}
          </fieldset>
        )}

        {input.kind === 'text' && (
          <input
            type="text"
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            aria-label="Tu respuesta"
            placeholder={input.placeholder}
            disabled={done}
            value={text}
            onInput={(e) => setText(e.currentTarget.value)}
            class="min-h-12 w-full rounded-control border-2 border-dojo-border bg-dojo-ink px-4 text-base"
          />
        )}

        {isNotes && (
          <Tabs
            label="Cómo responder"
            value={via}
            onChange={changeVia}
            tabs={vias.map((v) => ({ id: v, ...VIA_TABS[v] }))}
          >
            {via === 'keyboard' && (
              <Keyboard
                mode={instrumentMode}
                notation={notation}
                states={states}
                spelling={spelling}
                sound={prefs.sound}
                onPick={onPick}
                label="Teclado para responder"
              />
            )}
            {via === 'fretboard' && (
              <Fretboard
                mode={instrumentMode}
                notation={notation}
                states={states}
                spelling={spelling}
                sound={prefs.sound}
                lefty={prefs.lefty}
                onPick={onPick}
                label="Diapasón para responder"
              />
            )}
            {via === 'text' && (
              <input
                type="text"
                autocomplete="off"
                autocapitalize="off"
                spellcheck={false}
                aria-label="Escribe las notas"
                placeholder={count === 1 ? 'Ej.: fa#' : 'Ej.: re mi fa# sol'}
                disabled={done}
                value={text}
                onInput={(e) => {
                  setText(e.currentTarget.value)
                  setError(null)
                }}
                class="min-h-12 w-full rounded-control border-2 border-dojo-border bg-dojo-ink px-4 text-base"
              />
            )}
            {via === 'midi' && (
              <div class="space-y-3">
                <p class="text-sm text-dojo-muted" aria-live="polite">
                  {midi.status.state === 'connecting' && 'Conectando con MIDI…'}
                  {(midi.status.state === 'denied' || midi.status.state === 'unsupported') &&
                    midi.status.reason}
                  {midi.status.state === 'ready' &&
                    (midi.status.devices.length === 0
                      ? 'No hay ningún dispositivo MIDI conectado. Conecta uno y toca.'
                      : `Toca en ${midi.status.devices.join(', ')}.`)}
                </p>
                <Keyboard
                  mode="display"
                  notation={notation}
                  states={states}
                  label="Notas tocadas en el teclado MIDI"
                />
              </div>
            )}
          </Tabs>
        )}

        {isNotes && via !== 'text' && picks.length > 0 && (
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm text-dojo-muted">Elegiste:</span>
            <ol class="flex flex-wrap gap-2" aria-live="polite">
              {picks.map((p) => (
                <li
                  key={p.at}
                  class="inline-flex items-center gap-1 rounded-full bg-dojo-raised py-1 pr-1 pl-3"
                >
                  <NoteName note={p.name} notation={notation} />
                  {!done && (
                    <button
                      type="button"
                      class="inline-flex size-8 items-center justify-center rounded-full hover:bg-dojo-surface"
                      onClick={() => setPicks((prev) => prev.filter((x) => x.at !== p.at))}
                    >
                      <X size={14} aria-hidden="true" />
                      <span class="sr-only">Quitar</span>
                    </button>
                  )}
                </li>
              ))}
            </ol>
            {!done && (
              <button
                type="button"
                class={buttonClass('ghost', 'min-h-11')}
                onClick={() => setPicks([])}
              >
                Borrar
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert" class="text-sm text-dojo-danger">
            {error}
          </p>
        )}

        {!done && (
          <button type="submit" class={buttonClass('primary')}>
            Responder
          </button>
        )}
      </form>

      {done && mode === 'test' && (
        <p class="text-sm text-dojo-muted" role="status">
          Respuesta guardada.
        </p>
      )}

      {showResult && result && (
        <div class="space-y-3" role="status">
          <StatusBadge
            status={result.correct ? 'passed' : 'failed'}
            label={result.correct ? 'Correcto' : 'Incorrecto'}
          />
          {result.feedback && <p class="text-dojo-warning">{result.feedback}</p>}
          <Callout tone="hint" title="Explicación">
            {question.explanation}
          </Callout>
          {onNext && (
            <button type="button" class={buttonClass('primary')} onClick={onNext}>
              Siguiente
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </article>
  )
}
