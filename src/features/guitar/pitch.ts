// Monophonic pitch detection (YIN, de Cheveigné & Kawahara 2002) for a guitar input. Pure.
export const MIN_HZ = 70 // below E2 (82.4 Hz) with room for a low tuning
export const MAX_HZ = 1400 // above F6, fret 24 of the high E string
const THRESHOLD = 0.15

export interface PitchReading {
  hz: number
  clarity: number // 1 − YIN's normalized difference at the period: 1 = pure periodic
}

// Scratch arrays reused across calls: this runs every animation frame.
let d = new Float32Array(0)
let cmnd = new Float32Array(0)

export function detectPitch(buffer: Float32Array, sampleRate: number): PitchReading | null {
  const tauMin = Math.floor(sampleRate / MAX_HZ)
  const tauMax = Math.min(Math.floor(sampleRate / MIN_HZ), Math.floor(buffer.length / 2))
  const width = buffer.length - tauMax
  if (tauMax <= tauMin || width <= 0) return null

  // Difference function, then its cumulative mean normalization (YIN steps 2 and 3).
  if (d.length !== tauMax + 1) {
    d = new Float32Array(tauMax + 1)
    cmnd = new Float32Array(tauMax + 1)
  }
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0
    for (let j = 0; j < width; j++) {
      const delta = (buffer[j] ?? 0) - (buffer[j + tau] ?? 0)
      sum += delta * delta
    }
    d[tau] = sum
  }
  cmnd[0] = 1
  let running = 0
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau] ?? 0
    cmnd[tau] = running === 0 ? 1 : ((d[tau] ?? 0) * tau) / running
  }

  // First dip under the threshold, followed down to its local minimum (step 4).
  let tau = -1
  for (let t = tauMin; t <= tauMax; t++) {
    if ((cmnd[t] ?? 1) < THRESHOLD) {
      while (t + 1 <= tauMax && (cmnd[t + 1] ?? 1) < (cmnd[t] ?? 1)) t++
      tau = t
      break
    }
  }
  if (tau === -1) return null

  // Parabolic interpolation around the minimum for sub-sample precision (step 5).
  const a = cmnd[tau - 1] ?? cmnd[tau] ?? 1
  const b = cmnd[tau] ?? 1
  const c = cmnd[tau + 1] ?? b
  const shift = a + c - 2 * b === 0 ? 0 : (a - c) / (2 * (a + c - 2 * b))
  const hz = sampleRate / (tau + shift)
  if (hz < MIN_HZ || hz > MAX_HZ) return null
  return { hz, clarity: 1 - b }
}

export const hzToMidi = (hz: number) => 69 + 12 * Math.log2(hz / 440)

// Nearest semitone and how far from it, in cents (−50…50).
export function nearestNote(hz: number): { midi: number; cents: number } {
  const exact = hzToMidi(hz)
  const midi = Math.round(exact)
  return { midi, cents: Math.round((exact - midi) * 100) }
}

export function rms(buffer: Float32Array): number {
  let sum = 0
  for (const x of buffer) sum += x * x
  return Math.sqrt(sum / Math.max(1, buffer.length))
}
