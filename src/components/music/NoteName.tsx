import type { Notation } from '../../features/theory/es.ts'
import { formatNote, spokenNote } from '../../features/theory/notes.ts'

// A note as the profile writes it (Do♯ or C♯); screen readers hear "Do sostenido".
export default function NoteName({ note, notation }: { note: string; notation: Notation }) {
  return (
    <span>
      <span aria-hidden="true">{formatNote(note, notation)}</span>
      <span class="sr-only">{spokenNote(note, notation)}</span>
    </span>
  )
}
