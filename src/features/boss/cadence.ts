import { Note } from 'tonal'

// ponytail: modules have no key of their own, so each belt gets one by its order around the
// circle of fifths (M01 C, M02 G…); add a `key` to the module schema if a belt needs another.
const KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Db']

// I–IV–I as three close triads in the belt's key, one cycle, stretched to four seconds.
export function cadence(order: number): string {
  const tonic = `${KEYS[(order - 1) % KEYS.length] ?? 'C'}3`
  const triad = (root: string) =>
    `[${['1P', '3M', '5P'].map((i) => Note.transpose(root, i).toLowerCase()).join(',')}]`
  return `note("${triad(tonic)} ${triad(Note.transpose(tonic, '4P'))} ${triad(tonic)}").s("piano")`
}
