import { Cloud, CloudOff, RefreshCw } from 'lucide-preact'
import { useEffect, useState } from 'preact/hooks'
import { type SyncState, startSync, subscribeSync } from './controller.ts'

const LABEL: Record<Exclude<SyncState, 'off'>, string> = {
  idle: 'Sincronizado',
  syncing: 'Sincronizando…',
  offline: 'Sin conexión: se subirá al volver',
  error: 'No se pudo sincronizar',
}

export default function SyncBadge() {
  const [state, setState] = useState<SyncState>('off')
  useEffect(() => {
    const stop = subscribeSync(setState)
    startSync()
    return stop
  }, [])
  if (state === 'off') return null

  const Icon = state === 'syncing' ? RefreshCw : state === 'idle' ? Cloud : CloudOff
  return (
    <a
      href="/progreso#sincronizacion"
      class={`inline-flex size-6 shrink-0 items-center justify-center ${
        state === 'error' ? 'text-dojo-danger' : 'text-dojo-muted'
      }`}
      title={LABEL[state]}
    >
      <Icon size={18} aria-hidden="true" />
      <span class="sr-only">{LABEL[state]}</span>
    </a>
  )
}
