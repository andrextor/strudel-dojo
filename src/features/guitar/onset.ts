// Turns a stream of readings (one per animation frame) into note events: a note counts once it
// holds the same semitone for `holdMs`. The decay of a ringing note emits nothing; a re-attack of
// the same note (a jump in level) or any new note after silence emits again. Pure.
export interface Reading {
  time: number // ms
  rms: number
  midi: number | null // null when there is no clear pitch
}

export interface NoteEvent {
  time: number // ms when the note started (its attack), not when it was confirmed
  midi: number
}

export interface OnsetOptions {
  minRms: number
  holdMs?: number
  reattack?: number // a level this many times the previous reading counts as a new attack
}

export function createOnsetTracker({ minRms, holdMs = 40, reattack = 1.8 }: OnsetOptions) {
  let current: number | null = null // the note already emitted and still ringing
  let candidate: number | null = null
  let since = 0
  let previousRms = 0

  return function push({ time, rms, midi }: Reading): NoteEvent | null {
    const attack = rms > previousRms * reattack && rms > minRms * 2
    previousRms = rms
    if (rms < minRms || midi === null) {
      current = null
      candidate = null
      return null
    }
    if (attack) current = null
    if (midi !== candidate) {
      candidate = midi
      since = time
    }
    if (candidate !== current && time - since >= holdMs) {
      current = candidate
      return { time: since, midi: candidate }
    }
    return null
  }
}
