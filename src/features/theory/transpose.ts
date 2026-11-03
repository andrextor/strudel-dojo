import { Chord, Interval, Note } from 'tonal'

export function transposeSequence(notes: string[], interval: string): string[] | null {
  const result = notes.map((n) => Note.transpose(n, interval))
  return result.some((n) => n === '') ? null : result
}

// Transposes keeping the destination key's spelling by moving every note by the
// interval between the two tonics.
export function transposeToKey(notes: string[], fromKey: string, toKey: string): string[] | null {
  const interval = Interval.distance(fromKey, toKey)
  if (interval === '') return null
  return transposeSequence(notes, interval)
}

// The chord shape to finger so that, with a capo on `capoFret`, the chord sounds.
// ponytail: naive enharmonic spelling (flats from fromMidi), not CAGED-aware.
// Upgrade to preferred open-shape spelling if guitar lessons need it.
export function capoShape(chord: string, capoFret: number): string | null {
  if (!Number.isInteger(capoFret) || capoFret < 0) return null
  const parsed = Chord.get(chord)
  if (parsed.empty || parsed.tonic === null || parsed.tonic === '') return null
  const rootMidi = Note.midi(`${parsed.tonic}4`)
  if (rootMidi === null) return null
  const shapeRoot = Note.get(Note.fromMidi(rootMidi - capoFret)).pc
  const suffix = parsed.symbol.slice(parsed.tonic.length)
  return `${shapeRoot}${suffix}`
}
