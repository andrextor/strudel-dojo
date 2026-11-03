// Web MIDI input: support check, message parsing and chord grouping. The parsing and the
// grouper are pure so they run under node --test; only connectMidi touches the browser.

export const CHORD_WINDOW_MS = 80

export type MidiSupport = { supported: true } | { supported: false; reason: string }

export function midiSupport(nav: unknown = globalThis.navigator): MidiSupport {
  if (typeof nav !== 'object' || nav === null || !('requestMIDIAccess' in nav)) {
    return {
      supported: false,
      reason:
        'Este navegador no tiene Web MIDI (Safari y los navegadores de iPhone y iPad no lo traen). Usa Chrome, Edge o Firefox en un computador.',
    }
  }
  return { supported: true }
}

export interface NoteMessage {
  on: boolean
  note: number
  velocity: number
}

// Note-on with velocity 0 is a note-off (running-status keyboards send it that way).
export function parseMidiMessage(data: ArrayLike<number> | null): NoteMessage | null {
  if (data === null || data.length < 3) return null
  const status = (data[0] ?? 0) & 0xf0
  const note = data[1] ?? 0
  const velocity = data[2] ?? 0
  if (status === 0x90) return { on: velocity > 0, note, velocity }
  if (status === 0x80) return { on: false, note, velocity: 0 }
  return null
}

interface Timers {
  set: (fn: () => void, ms: number) => unknown
  clear: (handle: unknown) => void
}

const realTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
}

// Note-ons closer than `windowMs` to the first one are one chord; emitted sorted low→high.
export function chordGrouper(
  onChord: (notes: number[]) => void,
  windowMs = CHORD_WINDOW_MS,
  timers: Timers = realTimers,
) {
  let pending: number[] = []
  let timer: unknown = null
  const flush = () => {
    timer = null
    const notes = [...new Set(pending)].sort((a, b) => a - b)
    pending = []
    if (notes.length > 0) onChord(notes)
  }
  return {
    noteOn(note: number) {
      pending.push(note)
      timer ??= timers.set(flush, windowMs)
    },
    dispose() {
      if (timer !== null) timers.clear(timer)
      timer = null
      pending = []
    },
  }
}

export interface MidiConnection {
  devices: () => string[]
  disconnect: () => void
}

// Asks the browser for MIDI access and forwards note messages from every input, including
// devices plugged in later. Rejects when the permission is denied.
export async function connectMidi(
  onMessage: (msg: NoteMessage) => void,
  onDevices: (names: string[]) => void,
): Promise<MidiConnection> {
  const access = await navigator.requestMIDIAccess()
  const listen = (e: Event) => {
    if (e instanceof MIDIMessageEvent) {
      const msg = parseMidiMessage(e.data)
      if (msg) onMessage(msg)
    }
  }
  const devices = () => [...access.inputs.values()].map((i) => i.name ?? 'Dispositivo MIDI')
  const attach = () => {
    for (const input of access.inputs.values()) input.onmidimessage = listen
    onDevices(devices())
  }
  attach()
  access.onstatechange = attach
  return {
    devices,
    disconnect() {
      access.onstatechange = null
      for (const input of access.inputs.values()) input.onmidimessage = null
    },
  }
}
