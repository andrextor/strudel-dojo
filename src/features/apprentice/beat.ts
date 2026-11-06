// What the editor is playing, for the apprentice: every sounding event is a beat. Browser-only.
type Listener = (playing: boolean) => void

const beats = new Set<() => void>()
const playing = new Set<Listener>()

export function onBeat(listener: () => void) {
  beats.add(listener)
  return () => {
    beats.delete(listener)
  }
}

export function onPlaying(listener: Listener) {
  playing.add(listener)
  return () => {
    playing.delete(listener)
  }
}

// The scheduler fires ahead of the audio; `delay` lands the step on the sound.
export function emitBeat(delay: number) {
  if (beats.size === 0) return
  setTimeout(() => {
    for (const listener of beats) listener()
  }, Math.max(0, delay) * 1000)
}

export function emitPlaying(value: boolean) {
  for (const listener of playing) listener(value)
}
