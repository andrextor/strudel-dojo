// What the keyboard and the fretboard share: states, modes, the press logic (sound + spelling)
// and the C♯ / D♭ picker for exercises that need the note spelled.
import { useEffect, useRef, useState } from 'preact/hooks'
import { playMidiNotes } from '../../features/strudel/engine.ts'
import type { Notation } from '../../features/theory/es.ts'
import { spellingsFor } from '../../features/theory/instruments.ts'
import { formatNote } from '../../features/theory/notes.ts'

export type KeyState = 'active' | 'selected' | 'correct' | 'wrong'
export type InstrumentMode = 'display' | 'select-one' | 'select-many' | 'play'
// auto: the instrument names the note (sharps); black: ask on black keys; all: ask on any key
// with another spelling too (E♯, C♭, doubles).
export type Spelling = 'auto' | 'black' | 'all'

// `at` identifies the place pressed: "61" on the keyboard, "2:5" (string:fret) on the fretboard.
export interface Pick {
  midi: number
  name: string
  at: string
}

export type States = ReadonlyMap<string, KeyState>

export interface InstrumentProps {
  mode: InstrumentMode
  notation: Notation
  states?: States
  spelling?: Spelling
  sound?: boolean
  onPick?: (pick: Pick) => void
  names?: ReadonlyMap<string, string> // label per place, overriding the default spelling (lessons)
  label: string // in display mode it has to say what is marked: the instrument never names it
}

export const STATE_FILL: Record<KeyState, string> = {
  active: 'fill-dojo-neon [filter:drop-shadow(0_0_6px_var(--color-dojo-neon))]',
  selected: 'fill-dojo-violet',
  correct: 'fill-dojo-success',
  wrong: 'fill-dojo-danger',
}

export const STATE_WORD: Record<KeyState, string> = {
  active: 'sonando',
  selected: 'elegida',
  correct: 'correcta',
  wrong: 'incorrecta',
}

interface PickerState {
  midi: number
  at: string
  x: number // 0–100, horizontal position over the instrument
  options: string[]
}

export function usePress({
  mode,
  spelling = 'auto',
  sound = false,
  states,
  onPick,
}: InstrumentProps) {
  const [picker, setPicker] = useState<PickerState | null>(null)

  function press(midi: number, at: string, x: number) {
    if (mode === 'display') return
    if (sound || mode === 'play') void playMidiNotes([midi])
    if (mode === 'play') return
    const options =
      spelling === 'auto' ? spellingsFor(midi).slice(0, 1) : spellingsFor(midi, spelling === 'all')
    // A selected key is being un-selected: no need to ask how it is spelled.
    if (options.length === 1 || states?.get(at) === 'selected') {
      onPick?.({ midi, name: options[0] ?? '', at })
      return
    }
    setPicker({ midi, at, x, options })
  }

  function choose(name: string) {
    if (picker) onPick?.({ midi: picker.midi, name, at: picker.at })
    setPicker(null)
  }

  return { picker, press, choose, close: () => setPicker(null) }
}

interface PickerProps {
  picker: PickerState
  notation: Notation
  onChoose: (name: string) => void
  onClose: () => void
}

export function SpellingPicker({ picker, notation, onChoose, onClose }: PickerProps) {
  const box = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    box.current?.querySelector('button')?.focus()
  }, [])
  const buttons = () => [...(box.current?.querySelectorAll('button') ?? [])]

  return (
    <dialog
      open
      ref={box}
      aria-label="¿Cómo se escribe esta nota?"
      class="absolute top-2 z-10 m-0 flex -translate-x-1/2 gap-1 rounded-control border border-dojo-border bg-dojo-surface p-1 shadow-glow-neon"
      style={{ left: `${Math.min(90, Math.max(10, picker.x))}%` }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const all = buttons()
          const i = all.indexOf(document.activeElement as HTMLButtonElement)
          all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length]?.focus()
        }
      }}
      onFocusOut={(e) => {
        if (!(e.relatedTarget instanceof Node && box.current?.contains(e.relatedTarget))) onClose()
      }}
    >
      {picker.options.map((name) => (
        <button
          key={name}
          type="button"
          class="min-h-11 min-w-12 rounded-control px-3 text-lg font-semibold text-dojo-text hover:bg-dojo-raised"
          onClick={() => onChoose(name)}
        >
          {formatNote(name, notation)}
        </button>
      ))}
    </dialog>
  )
}

interface KeyAttrs {
  tabbable: boolean
  pressed: boolean | undefined
  label: string
  onPress: () => void
  onKeyDown: (e: KeyboardEvent) => void
}

// A key is a button only when the instrument takes input; in display mode it is just a shape.
export function keyAttrs(interactive: boolean, a: KeyAttrs) {
  if (!interactive) return {}
  return {
    role: 'button' as const,
    tabindex: a.tabbable ? 0 : -1, // lowercase: on SVG, Preact sets the attribute as written
    'aria-pressed': a.pressed,
    'aria-label': a.label,
    onClick: a.onPress,
    onKeyDown: a.onKeyDown,
  }
}
