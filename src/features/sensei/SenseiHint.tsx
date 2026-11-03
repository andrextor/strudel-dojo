import { LoaderCircle, RotateCcw, Sparkles } from 'lucide-preact'
import { useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import Callout from '../../components/ui/Callout.tsx'
import { askHint } from './client.ts'

interface Props {
  body: () => unknown // the request, built when the button is pressed (current code or answer)
  disabled?: boolean
  note?: string | undefined // shown under the button before the first hint
  onHint?: () => void
}

// "Pedir pista al Sensei": loading, error with retry, and the hints received so far.
export default function SenseiHint({ body, disabled = false, note, onHint }: Props) {
  const [hints, setHints] = useState<string[]>([])
  const [state, setState] = useState<'idle' | 'loading' | { error: string }>('idle')

  async function ask() {
    setState('loading')
    const r = await askHint(body())
    if (!r.ok) return setState({ error: r.error })
    setHints((h) => [...h, r.data.hint])
    setState('idle')
    onHint?.()
  }

  return (
    <div class="space-y-2">
      {hints.map((h, i) => (
        <Callout key={`${i}:${h}`} tone="sensei" title="Pista del Sensei">
          {h}
        </Callout>
      ))}
      {typeof state === 'object' && (
        <p role="alert" class="text-sm text-dojo-danger">
          {state.error}
        </p>
      )}
      {!disabled && (
        <button
          type="button"
          class={buttonClass('ghost', 'min-h-11')}
          disabled={state === 'loading'}
          onClick={() => void ask()}
        >
          {state === 'loading' ? (
            <LoaderCircle size={18} class="motion-safe:animate-spin" aria-hidden="true" />
          ) : typeof state === 'object' ? (
            <RotateCcw size={18} aria-hidden="true" />
          ) : (
            <Sparkles size={18} aria-hidden="true" />
          )}
          {state === 'loading'
            ? 'El Sensei está pensando…'
            : typeof state === 'object'
              ? 'Reintentar'
              : hints.length > 0
                ? 'Otra pista'
                : 'Pedir pista al Sensei'}
        </button>
      )}
      {note && !disabled && hints.length === 0 && <p class="text-xs text-dojo-muted">{note}</p>}
    </div>
  )
}
