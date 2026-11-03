import { ExternalLink, FolderOpen, Save, Trash2 } from 'lucide-preact'
import { useRef, useState } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import { freshRng } from '../../lib/random.ts'
import NeedProfile from '../profiles/NeedProfile.tsx'
import { useProgress } from '../progress/use-progress.ts'
import { useSenseiEnabled } from '../sensei/client.ts'
import ExplainCode from '../sensei/ExplainCode.tsx'
import StrudelEditor, { type EditorApi } from '../strudel/StrudelEditor.tsx'
import ReferencePanel from './ReferencePanel.tsx'
import { deleteScroll, MAX_SCROLLS, SCROLL_NAME_MAX, saveScroll, strudelUrl } from './scrolls.ts'

const WELCOME = `// Dojo libre: Cmd/Ctrl+Enter suena, Esc para todo.
stack(
  s("bd*2 [~ sd] bd sd"),
  note("<c3 a2 f2 g2>").s("sawtooth").lpf(800),
)`

export default function DojoRepl() {
  const { active, progress, updateProgress } = useProgress()
  const editor = useRef<EditorApi | null>(null)
  const [name, setName] = useState('')
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const sensei = useSenseiEnabled()
  if (active === null || progress === null) return <NeedProfile />

  const scrolls = [...progress.scrolls].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  function save(e: Event) {
    e.preventDefault()
    if (progress === null) return
    const result = saveScroll(
      progress,
      name,
      editor.current?.getCode() ?? '',
      new Date(),
      freshRng(),
    )
    if (!result.ok) return setNotice({ ok: false, text: result.error })
    updateProgress(() => result.progress)
    setNotice({ ok: true, text: `Guardado «${result.scroll.name}».` })
  }

  return (
    <div class="space-y-6">
      <h1 class="font-display text-3xl font-bold">Dojo libre</h1>
      <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="min-w-0 space-y-4">
          <StrudelEditor
            initialCode={WELCOME}
            onReady={(api) => {
              editor.current = api
            }}
          />
          {sensei && <ExplainCode getCode={() => editor.current?.getCode() ?? ''} />}
          <form class="flex flex-wrap items-end gap-3" onSubmit={save}>
            <label class="block min-w-48 flex-1 space-y-1">
              <span class="text-sm text-dojo-muted">Nombre del pergamino</span>
              <input
                type="text"
                autocomplete="off"
                maxLength={SCROLL_NAME_MAX}
                value={name}
                onInput={(e) => {
                  setName(e.currentTarget.value)
                  setNotice(null)
                }}
                class="min-h-12 w-full rounded-control border-2 border-dojo-border bg-dojo-ink px-4 text-base"
              />
            </label>
            <button type="submit" class={buttonClass('primary')}>
              <Save size={18} aria-hidden="true" />
              Guardar pergamino
            </button>
            <a
              class={buttonClass('secondary')}
              href={strudelUrl(editor.current?.getCode() ?? WELCOME)}
              target="_blank"
              rel="noopener"
              onClick={(e) => {
                e.currentTarget.href = strudelUrl(editor.current?.getCode() ?? WELCOME)
              }}
            >
              <ExternalLink size={18} aria-hidden="true" />
              Abrir en strudel.cc
            </a>
          </form>
          {notice && (
            <p role="status" class={notice.ok ? 'text-dojo-success' : 'text-dojo-danger'}>
              {notice.text}
            </p>
          )}

          <section class="space-y-3 rounded-card bg-dojo-surface p-4">
            <h2 class="font-semibold">
              Tus pergaminos ({progress.scrolls.length}/{MAX_SCROLLS})
            </h2>
            {scrolls.length === 0 ? (
              <p class="text-sm text-dojo-muted">Guarda aquí tus patrones favoritos.</p>
            ) : (
              <ul class="divide-y divide-dojo-hairline">
                {scrolls.map((s) => (
                  <li key={s.id} class="flex flex-wrap items-center gap-2 py-2">
                    <span class="min-w-0 flex-1 truncate font-semibold">{s.name}</span>
                    <button
                      type="button"
                      class={buttonClass('ghost', 'min-h-11')}
                      onClick={() => {
                        editor.current?.setCode(s.code)
                        setName(s.name)
                      }}
                    >
                      <FolderOpen size={18} aria-hidden="true" />
                      Abrir
                    </button>
                    <button
                      type="button"
                      class={buttonClass('ghost', 'min-h-11 text-dojo-danger')}
                      onClick={() => updateProgress((p) => deleteScroll(p, s.id))}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                      <span class="sr-only">Borrar {s.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <ReferencePanel onInsert={(code) => editor.current?.setCode(code)} />
      </div>
    </div>
  )
}
