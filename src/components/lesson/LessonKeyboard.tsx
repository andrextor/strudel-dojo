// Read-only keyboard for lessons (rendered at build time, no JS). `highlight` takes note names:
// "C" marks every C in range, "C4" only that key. Only marked keys get a label: their name with
// the spelling given (B♭, not A♯), or their degree from `tonic`.
import { Note } from 'tonal'
import { degreeLabel } from '../../features/theory/instruments.ts'
import { formatNote } from '../../features/theory/notes.ts'
import type { KeyState } from '../music/instrument.tsx'
import Keyboard from '../music/Keyboard.tsx'

interface Props {
  highlight?: string[]
  low?: string
  high?: string
  labels?: 'name' | 'degree' | 'none'
  tonic?: string
  label: string
}

export default function LessonKeyboard({
  highlight = [],
  low = 'C4',
  high = 'B4',
  labels = 'none',
  tonic,
  label,
}: Props) {
  const lo = Note.midi(low) ?? 60
  const hi = Note.midi(high) ?? 71
  const states = new Map<string, KeyState>()
  const names = new Map<string, string>()
  for (const raw of highlight) {
    const note = Note.get(raw)
    if (note.empty) continue
    for (let m = lo; m <= hi; m++) {
      const hit = note.oct === undefined ? m % 12 === note.chroma : m === note.midi
      if (!hit) continue
      states.set(String(m), 'selected')
      names.set(
        String(m),
        labels === 'degree' ? degreeLabel(m, tonic ?? 'C') : formatNote(note.pc, 'latin'),
      )
    }
  }
  return (
    <figure class="my-4">
      <Keyboard
        mode="display"
        notation="latin"
        low={lo}
        high={hi}
        states={states}
        names={labels === 'none' ? new Map() : names}
        labels="none"
        label={label}
      />
      <figcaption class="mt-1 text-sm text-dojo-muted">{label}</figcaption>
    </figure>
  )
}
