import { LoaderCircle, MessageSquareText, RotateCcw } from 'lucide-preact'
import { useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import { askExplain } from './client.ts'
import type { ExplainResult } from './contracts.ts'

// "Explícame este código": an overview plus one note per line, from the code as it is now.
export default function ExplainCode({ getCode }: { getCode: () => string }) {
  const [state, setState] = useState<'idle' | 'loading' | { error: string } | ExplainResult>('idle')
  const result = typeof state === 'object' && 'overview' in state ? state : null
  const error = typeof state === 'object' && 'error' in state ? state.error : null

  async function explain() {
    setState('loading')
    const r = await askExplain(getCode())
    setState(r.ok ? r.data : { error: r.error })
  }

  return (
    <div class="space-y-3">
      <button
        type="button"
        class={buttonClass('ghost', 'min-h-11')}
        disabled={state === 'loading'}
        onClick={() => void explain()}
      >
        {state === 'loading' ? (
          <LoaderCircle size={18} class="motion-safe:animate-spin" aria-hidden="true" />
        ) : error ? (
          <RotateCcw size={18} aria-hidden="true" />
        ) : (
          <MessageSquareText size={18} aria-hidden="true" />
        )}
        {state === 'loading'
          ? 'El Sensei está leyendo…'
          : error
            ? 'Reintentar'
            : 'Explícame este código'}
      </button>
      {error && (
        <p role="alert" class="text-sm text-dojo-danger">
          {error}
        </p>
      )}
      {result && (
        <div
          class="space-y-2 rounded-card border-l-4 border-dojo-violet bg-dojo-surface p-4"
          aria-live="polite"
        >
          <p>{result.overview}</p>
          <ol class="space-y-1 text-sm text-dojo-muted">
            {result.lines.map((l) => (
              <li key={`${l.line}:${l.text}`}>
                <span class="font-mono text-dojo-violet">Línea {l.line}:</span> {l.text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
