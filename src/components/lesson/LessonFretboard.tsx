// Read-only fretboard for lessons (build time). Marks every position of the given pitch classes
// up to `frets`, labelled with the spelling given.
import { Note } from 'tonal'
import { fretToNote, STANDARD_TUNING } from '../../features/theory/instruments.ts'
import { formatNote } from '../../features/theory/notes.ts'
import Fretboard from '../music/Fretboard.tsx'
import type { KeyState } from '../music/instrument.tsx'

interface Props {
  highlight: string[]
  frets?: number
  strings?: number[] // string numbers as guitarists count them (6 = low E); all by default
  label: string
}

export default function LessonFretboard({ highlight, frets = 12, strings, label }: Props) {
  const states = new Map<string, KeyState>()
  const names = new Map<string, string>()
  for (const raw of highlight) {
    const note = Note.get(raw)
    if (note.empty) continue
    for (let s = 0; s < STANDARD_TUNING.length; s++) {
      if (strings && !strings.includes(STANDARD_TUNING.length - s)) continue
      for (let f = 0; f <= frets; f++) {
        const n = fretToNote(s, f)
        if (n === null || Note.chroma(n) !== note.chroma) continue
        states.set(`${s}:${f}`, 'selected')
        names.set(`${s}:${f}`, formatNote(note.pc, 'latin'))
      }
    }
  }
  return (
    <figure class="my-4">
      <Fretboard
        mode="display"
        notation="latin"
        frets={frets}
        states={states}
        names={names}
        labels="name"
        label={label}
      />
      <figcaption class="mt-1 text-sm text-dojo-muted">{label}</figcaption>
    </figure>
  )
}
