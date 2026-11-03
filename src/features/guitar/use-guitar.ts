import { useEffect, useRef, useState } from 'preact/hooks'
import { type GuitarInput, openGuitarInput } from './mic.ts'
import { createOnsetTracker, type NoteEvent } from './onset.ts'
import { detectPitch, nearestNote, rms } from './pitch.ts'

export type InputStatus =
  | { state: 'off' }
  | { state: 'opening' }
  | { state: 'denied'; reason: string }
  | { state: 'on'; input: GuitarInput }

export interface Live {
  level: number
  midi: number | null
  cents: number
}

// The open input, a live reading (level, note, cents) for the meter and tuner, and note events
// for the drills (`onNote` is read through a ref, so it can change every render).
export function useGuitar(deviceId: string | null, minRms: number, onNote: (e: NoteEvent) => void) {
  const [status, setStatus] = useState<InputStatus>({ state: 'off' })
  const [live, setLive] = useState<Live>({ level: 0, midi: null, cents: 0 })
  const noteRef = useRef(onNote)
  noteRef.current = onNote

  async function open(id: string | null = deviceId) {
    setStatus({ state: 'opening' })
    try {
      setStatus({ state: 'on', input: await openGuitarInput(id) })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      setStatus({
        state: 'denied',
        reason:
          name === 'NotAllowedError'
            ? 'El navegador no dio permiso para el micrófono. Ábrelo desde el candado de la barra de direcciones, permite el micrófono y vuelve a intentarlo.'
            : name === 'NotFoundError'
              ? 'No hay ninguna entrada de audio conectada. Conecta la interfaz o el micrófono.'
              : 'No se pudo abrir la entrada de audio. Revisa que ninguna otra app la esté usando.',
      })
    }
  }

  useEffect(() => {
    if (status.state !== 'on') return
    const { input } = status
    const track = createOnsetTracker({ minRms })
    let frame = 0
    let last = 0
    const loop = () => {
      const buffer = input.read()
      const level = rms(buffer)
      const reading = level >= minRms ? detectPitch(buffer, input.context.sampleRate) : null
      const pitch = reading && reading.clarity >= 0.85 ? nearestNote(reading.hz) : null
      const now = input.context.currentTime * 1000
      const event = track({ time: now, rms: level, midi: pitch?.midi ?? null })
      if (event) noteRef.current(event)
      // The meter and tuner only need ~15 updates a second.
      if (now - last > 66) {
        last = now
        setLive({ level, midi: pitch?.midi ?? null, cents: pitch?.cents ?? 0 })
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [status, minRms])

  // Leaving the page releases the microphone.
  useEffect(
    () => () => {
      if (status.state === 'on') status.input.close()
    },
    [status],
  )

  return { status, live, open, close: () => setStatus({ state: 'off' }) }
}
