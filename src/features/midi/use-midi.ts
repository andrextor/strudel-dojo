import { useEffect, useRef, useState } from 'preact/hooks'
import { chordGrouper, connectMidi, midiSupport } from './midi.ts'

export type MidiStatus =
  | { state: 'off' }
  | { state: 'unsupported'; reason: string }
  | { state: 'connecting' }
  | { state: 'denied'; reason: string }
  | { state: 'ready'; devices: string[] }

// MIDI input while `enabled`: the held notes (to light the keyboard) and one callback per
// chord (notes played within 80 ms; a single note is a chord of one).
export function useMidi(enabled: boolean, onChord: (notes: number[]) => void) {
  const [status, setStatus] = useState<MidiStatus>({ state: 'off' })
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set())
  const chordRef = useRef(onChord)
  chordRef.current = onChord

  useEffect(() => {
    if (!enabled) {
      setStatus({ state: 'off' })
      return
    }
    const support = midiSupport()
    if (!support.supported) {
      setStatus({ state: 'unsupported', reason: support.reason })
      return
    }
    let disposed = false
    let disconnect = () => {}
    const grouper = chordGrouper((notes) => chordRef.current(notes))
    setStatus({ state: 'connecting' })
    connectMidi(
      (msg) => {
        setHeld((prev) => {
          const next = new Set(prev)
          if (msg.on) next.add(msg.note)
          else next.delete(msg.note)
          return next
        })
        if (msg.on) grouper.noteOn(msg.note)
      },
      (devices) => {
        if (!disposed) setStatus({ state: 'ready', devices })
      },
    ).then(
      (conn) => {
        if (disposed) conn.disconnect()
        else disconnect = conn.disconnect
      },
      () => {
        if (!disposed) {
          setStatus({
            state: 'denied',
            reason:
              'El navegador no dio permiso para usar MIDI. Revísalo en la barra de direcciones.',
          })
        }
      },
    )
    return () => {
      disposed = true
      grouper.dispose()
      disconnect()
      setHeld(new Set())
    }
  }, [enabled])

  return { status, held }
}
