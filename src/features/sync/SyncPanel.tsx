import { useEffect, useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import { loadSyncMark } from '../progress/store.ts'
import { currentEmail, hasSession, sendCode, signOut, verifyCode } from './client.ts'
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

export default function SyncPanel() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [signedIn, setSignedIn] = useState<string | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<SyncState>('off')

  useEffect(() => {
    const stop = subscribeSync(setState)
    if (hasSession()) void currentEmail().then(setSignedIn)
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
      const result = await sendCode(email.trim())
      if (result.ok) setCodeSent(true)
      else setError(result.error)
    })

  const confirm = () =>
    submit(async () => {
      const result = await verifyCode(email.trim(), code.trim())
      if (!result.ok) return setError(result.error)
      setSignedIn(email.trim())
      setCode('')
      setCodeSent(false)
      startSync()
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
        Sincronización
      </h2>
      {signedIn ? (
        <>
          <p class="text-dojo-muted">
            Conectado como {signedIn}. Estado: {STATE_ES[state]}
          </p>
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
            void (codeSent ? confirm() : request())
          }}
        >
          <p class="text-dojo-muted">
            Lleva tu progreso entre el celular y la laptop. Si este dispositivo ya tiene un perfil,
            usa el mismo nombre en los dos para que se unan.
          </p>
          <label class="block space-y-1">
            <span class="text-sm">Correo</span>
            <input
              type="email"
              required
              autocomplete="email"
              class={field}
              value={email}
              disabled={codeSent}
              onInput={(e) => setEmail(e.currentTarget.value)}
            />
          </label>
          {codeSent && (
            <label class="block space-y-1">
              <span class="text-sm">Código de 6 dígitos que te llegó por correo</span>
              <input
                inputMode="numeric"
                autocomplete="one-time-code"
                required
                pattern="[0-9]{6}"
                maxLength={6}
                class={field}
                value={code}
                onInput={(e) => setCode(e.currentTarget.value)}
              />
            </label>
          )}
          <button type="submit" class={buttonClass('primary')} disabled={busy}>
            {codeSent ? 'Entrar' : 'Enviarme un código'}
          </button>
          {codeSent && (
            <button
              type="button"
              class={buttonClass('ghost')}
              onClick={() => {
                setCodeSent(false)
                setCode('')
                setError(null)
              }}
            >
              Cambiar correo
            </button>
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
