// Clicks scheduled ahead on the same AudioContext that listens, so the beat and the played note
// share one clock. No Strudel here (spec 08). Browser only.
const LOOKAHEAD = 0.1 // seconds scheduled ahead
const TICK_MS = 25

export interface Metronome {
  beatTime: (n: number) => number // seconds, context clock
  stop: () => void
}

export function startMetronome(
  context: AudioContext,
  {
    bpm,
    beatsPerBar = 4,
    delay = 0.3,
    subdivision = 1,
  }: {
    bpm: number
    beatsPerBar?: number
    delay?: number
    subdivision?: number // 2 = eighth notes: two steps per beat, the off-beat is quieter
  },
): Metronome {
  const start = context.currentTime + delay
  const step = 60 / bpm / subdivision
  let next = 0
  const click = (at: number, n: number) => {
    const accent = n % (beatsPerBar * subdivision) === 0
    const offBeat = n % subdivision !== 0
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.frequency.value = accent ? 1600 : offBeat ? 800 : 1100
    gain.gain.setValueAtTime(offBeat ? 0.15 : 0.4, at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.05)
    osc.connect(gain).connect(context.destination)
    osc.start(at)
    osc.stop(at + 0.06)
  }
  const timer = setInterval(() => {
    while (start + next * step < context.currentTime + LOOKAHEAD) {
      click(start + next * step, next)
      next++
    }
  }, TICK_MS)
  return { beatTime: (n) => start + n * step, stop: () => clearInterval(timer) }
}
