import { useEffect, useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import { loadSyncMark } from '../progress/store.ts'
import {
  arrivedFromLink,
  currentEmail,
  hasSession,
  linkFailure,
  sendLink,
  signOut,
} from './client.ts'
import { runSync, type SyncState, startSync, stopSync, subscribeSync } from './controller.ts'

const STATE_ES: Record<SyncState, string> = {
  off: 'Apagada',
  idle: 'Al día',
  syncing: 'Sincronizando…',
  offline: 'Sin conexión: se subirá al volver',
  error: 'No se pudo sincronizar. Tu progreso sigue guardado en este dispositivo.',
}

const field =
  'min-h-11 w-full rounded-control border-2 border-dojo-border bg-dojo-raised px-3 text-dojo-text'

// `entry`: on the profile picker, where a new device signs in to bring its profiles down.
export default function SyncPanel({ entry = false }: { entry?: boolean }) {
  const [email, setEmail] = useState('')
  const [signedIn, setSignedIn] = useState<string | null>(null)
  const [linkSent, setLinkSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<SyncState>('off')

  useEffect(() => {
    const stop = subscribeSync(setState)
    setError(linkFailure())
    if (hasSession() || arrivedFromLink()) {
      void currentEmail().then((signed) => {
        setSignedIn(signed)
        if (signed !== null) startSync()
        if (location.hash !== '') history.replaceState(null, '', location.pathname)
      })
    }
    return stop
  }, [])

  async function submit(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    await action()
    setBusy(false)
  }

  const request = () =>
    submit(async () => {
      const result = await sendLink(email.trim())
      if (result.ok) setLinkSent(true)
      else setError(result.error)
    })

  const leave = () =>
    submit(async () => {
      await signOut()
      stopSync()
      setSignedIn(null)
    })

  const last = loadSyncMark().lastSyncedAt

  return (
    <section
      id="sincronizacion"
      class="space-y-4 rounded-card bg-dojo-surface p-5 md:p-6"
      aria-labelledby="sync-title"
    >
      <h2 id="sync-title" class="font-display text-xl font-bold">
        {entry ? '¿Ya entrenas en otro dispositivo?' : 'Sincronización'}
      </h2>
      {signedIn ? (
        <>
          <p class="text-dojo-muted">
            Conectado como {signedIn}. Estado: {STATE_ES[state]}
          </p>
          {entry && state === 'idle' && (
            <p>Listo: elige tu perfil arriba. Si no aparece, crea uno nuevo.</p>
          )}
          {last && (
            <p class="text-sm text-dojo-muted">
              Última sincronización: {new Date(last).toLocaleString('es')}
            </p>
          )}
          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class={buttonClass('primary')}
              disabled={state === 'syncing'}
              onClick={() => void runSync()}
            >
              Sincronizar ahora
            </button>
            <button
              type="button"
              class={buttonClass('secondary')}
              disabled={busy}
              onClick={() => void leave()}
            >
              Cerrar sesión
            </button>
          </div>
          <p class="text-sm text-dojo-muted">
            Al cerrar sesión, tu progreso se queda en este dispositivo.
          </p>
        </>
      ) : (
        <form
          class="max-w-sm space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void request()
          }}
        >
          <p class="text-dojo-muted">
            {entry
              ? 'Entra con tu correo y tus perfiles aparecen aquí, con todo su progreso.'
              : 'Lleva tu progreso entre el celular y la laptop. Los perfiles con el mismo nombre se unen en uno.'}
          </p>
          <label class="block space-y-1">
            <span class="text-sm">Correo</span>
            <input
              type="email"
              required
              autocomplete="email"
              class={field}
              value={email}
              onInput={(e) => setEmail(e.currentTarget.value)}
            />
          </label>
          <button type="submit" class={buttonClass('primary')} disabled={busy}>
            {linkSent ? 'Enviar otro enlace' : 'Enviarme un enlace'}
          </button>
          {linkSent && (
            <p role="status" class="text-sm">
              Revisa tu correo y abre el enlace en este mismo navegador. Vence en 10 minutos.
            </p>
          )}
          {error && (
            <p role="alert" class="text-sm text-dojo-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
