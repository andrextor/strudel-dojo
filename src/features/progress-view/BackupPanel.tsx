import { ClipboardCopy, ClipboardPaste, Download, Upload } from 'lucide-preact'
import { useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import Callout from '../../components/ui/Callout.tsx'
import { freshRng } from '../../lib/random.ts'
import { createProfile } from '../profiles/profiles.ts'
import {
  BACKUP_INVALID,
  type Backup,
  createBackup,
  decodeBackup,
  encodeBackup,
  mergeBackup,
  readBackupFile,
} from '../progress/persist.ts'
import { useProgress } from '../progress/use-progress.ts'

const REMIND_DAYS = 14
type Notice = { ok: boolean; text: string } | null

export default function BackupPanel() {
  const { active, progress, profiles, updateProgress, updateProfiles, writeProgress } =
    useProgress()
  const [notice, setNotice] = useState<Notice>(null)
  const [pasted, setPasted] = useState('')
  const [pending, setPending] = useState<Backup | null>(null)

  const backup = () => (active && progress ? createBackup(active, progress, new Date()) : null)
  const markBackedUp = () => updateProgress((p) => ({ ...p, backedUpAt: new Date().toISOString() }))

  function download() {
    const b = backup()
    if (b === null || active === null) return
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `strudel-dojo-${active.name.toLowerCase().replace(/\s+/g, '-')}-${b.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    markBackedUp()
    setNotice({ ok: true, text: 'Respaldo descargado.' })
  }

  async function copyCode() {
    const b = backup()
    if (b === null) return
    try {
      await navigator.clipboard.writeText(encodeBackup(b))
      markBackedUp()
      setNotice({
        ok: true,
        text: 'Código copiado. Pégalo en «Pegar código» en el otro dispositivo.',
      })
    } catch {
      setNotice({
        ok: false,
        text: 'El navegador no dejó copiar. Prueba con «Descargar respaldo».',
      })
    }
  }

  // A valid backup asks where to go: over the active profile (merge) or as a new profile.
  function offer(b: Backup | null) {
    if (b === null) return setNotice({ ok: false, text: BACKUP_INVALID })
    setNotice(null)
    if (active === null) restoreAsNew(b)
    else setPending(b)
  }

  function restoreOver(b: Backup) {
    if (progress === null) return
    const merged = mergeBackup(progress, b)
    if (!merged.ok) return setNotice({ ok: false, text: merged.error })
    updateProgress(() => merged.progress)
    setPending(null)
    setNotice({
      ok: true,
      text: `Respaldo fusionado con ${active?.name ?? 'tu perfil'} (${merged.addedAttempts} intentos nuevos).`,
    })
  }

  function restoreAsNew(b: Backup) {
    let name = b.profile.name
    for (
      let n = 2;
      profiles.profiles.some((p) => p.name.toLowerCase() === name.toLowerCase());
      n++
    ) {
      name = `${b.profile.name} ${n}`
    }
    const created = createProfile(profiles, name, b.profile.color, new Date(), freshRng())
    if (!created.ok) return setNotice({ ok: false, text: created.error })
    writeProgress(created.profile.id, b.progress)
    updateProfiles(() => created.state)
    setPending(null)
    setNotice({ ok: true, text: `Perfil «${name}» restaurado. Ya es el perfil activo.` })
  }

  const stale =
    progress !== null &&
    progress.attempts.length > 0 &&
    (progress.backedUpAt === null ||
      Date.now() - Date.parse(progress.backedUpAt) > REMIND_DAYS * 86_400_000)

  return (
    <section class="space-y-4 rounded-card bg-dojo-surface p-5 md:p-6">
      <h2 class="font-display text-xl font-bold">Respaldo</h2>
      <p class="text-dojo-muted">
        El progreso vive solo en este navegador. Descárgalo o cópialo como código para pasarlo a
        otro dispositivo. Restaurar nunca borra: fusiona.
      </p>
      {stale && (
        <Callout tone="warning" title="Hace tiempo que no respaldas">
          Pasaron más de {REMIND_DAYS} días desde tu último respaldo.
        </Callout>
      )}

      {active && (
        <div class="flex flex-wrap gap-3">
          <button type="button" class={buttonClass('primary')} onClick={download}>
            <Download size={18} aria-hidden="true" />
            Descargar respaldo
          </button>
          <button type="button" class={buttonClass('secondary')} onClick={() => void copyCode()}>
            <ClipboardCopy size={18} aria-hidden="true" />
            Copiar código
          </button>
        </div>
      )}

      <div class="grid gap-4 md:grid-cols-2">
        <label class="block space-y-2">
          <span class="flex items-center gap-2 font-semibold">
            <Upload size={18} aria-hidden="true" />
            Restaurar desde archivo
          </span>
          <input
            type="file"
            accept="application/json,.json"
            class="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-control file:border-2 file:border-dojo-border file:bg-transparent file:px-4 file:text-dojo-text"
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0]
              if (file) offer(readBackupFile(await file.text()))
              e.currentTarget.value = ''
            }}
          />
        </label>
        <form
          class="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            offer(decodeBackup(pasted.trim()))
          }}
        >
          <label class="block space-y-2">
            <span class="flex items-center gap-2 font-semibold">
              <ClipboardPaste size={18} aria-hidden="true" />
              Pegar código
            </span>
            <textarea
              rows={2}
              autocomplete="off"
              spellcheck={false}
              placeholder="sdojo1:…"
              value={pasted}
              onInput={(e) => setPasted(e.currentTarget.value)}
              class="w-full rounded-control border-2 border-dojo-border bg-dojo-ink p-3 font-mono text-sm"
            />
          </label>
          <button type="submit" class={buttonClass('secondary')} disabled={pasted.trim() === ''}>
            Restaurar código
          </button>
        </form>
      </div>

      {pending && (
        <div class="space-y-3 rounded-card bg-dojo-raised p-4" role="alert">
          <p>
            Respaldo de <strong>{pending.profile.name}</strong> del{' '}
            {new Date(pending.exportedAt).toLocaleDateString('es')}. ¿Dónde lo restauro?
          </p>
          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class={buttonClass('primary')}
              onClick={() => restoreOver(pending)}
            >
              Fusionar con {active?.name}
            </button>
            <button
              type="button"
              class={buttonClass('secondary')}
              onClick={() => restoreAsNew(pending)}
            >
              Como perfil nuevo
            </button>
            <button type="button" class={buttonClass('ghost')} onClick={() => setPending(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {notice && (
        <p role="status" class={notice.ok ? 'text-dojo-success' : 'text-dojo-danger'}>
          {notice.text}
        </p>
      )}
    </section>
  )
}
