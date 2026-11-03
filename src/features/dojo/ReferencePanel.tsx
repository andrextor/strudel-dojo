import { BookOpen, Search } from 'lucide-preact'
import { useEffect, useState } from 'preact/hooks'

interface Doc {
  name: string
  text: string
  example: string | null
}

let docs: Promise<Doc[]> | null = null

// @strudel/reference is ~550 kB, so it loads only when the panel opens. Descriptions are the
// package's HTML; tags are stripped so nothing is injected into the page.
const loadDocs = () =>
  (docs ??= import('@strudel/reference').then(({ reference }) =>
    reference.docs.flatMap((d) =>
      typeof d.name === 'string'
        ? [
            {
              name: d.name,
              text: (d.description ?? '')
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .trim(),
              example: d.examples?.[0] ?? null,
            },
          ]
        : [],
    ),
  ))

export default function ReferencePanel({ onInsert }: { onInsert: (code: string) => void }) {
  const [all, setAll] = useState<Doc[] | null>(null)
  const [query, setQuery] = useState('')
  useEffect(() => {
    void loadDocs().then(setAll)
  }, [])
  const q = query.trim().toLowerCase()
  // Name matches first (exact, then prefix, then anywhere), description matches after.
  const rank = (d: Doc) => {
    const name = d.name.toLowerCase()
    if (name === q) return 0
    if (name.startsWith(q)) return 1
    return name.includes(q) ? 2 : 3
  }
  const found = (all ?? [])
    .filter((d) => q === '' || d.name.toLowerCase().includes(q) || d.text.toLowerCase().includes(q))
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 40)

  return (
    <section class="space-y-3 rounded-card bg-dojo-surface p-4">
      <h2 class="flex items-center gap-2 font-semibold">
        <BookOpen size={18} aria-hidden="true" />
        Referencia de Strudel
      </h2>
      <label class="relative block">
        <span class="sr-only">Buscar función</span>
        <Search size={16} class="absolute top-4 left-3 text-dojo-muted" aria-hidden="true" />
        <input
          type="search"
          autocomplete="off"
          placeholder="Buscar: scale, fast, lpf…"
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
          class="min-h-12 w-full rounded-control border-2 border-dojo-border bg-dojo-ink pr-3 pl-9 text-base"
        />
      </label>
      {all === null ? (
        <p class="text-sm text-dojo-muted">Cargando la referencia…</p>
      ) : (
        <ul class="max-h-[28rem] space-y-3 overflow-y-auto pr-1" aria-live="polite">
          {found.map((d) => (
            <li key={d.name} class="space-y-1 border-b border-dojo-hairline pb-3">
              <p class="font-mono font-semibold text-dojo-violet">{d.name}</p>
              {d.text && <p class="line-clamp-3 text-sm text-dojo-muted">{d.text}</p>}
              {d.example && (
                <button
                  type="button"
                  class="block w-full rounded-control bg-dojo-raised p-2 text-left font-mono text-xs hover:text-dojo-neon"
                  onClick={() => onInsert(d.example ?? '')}
                  title="Abrir el ejemplo en el editor"
                >
                  {d.example}
                </button>
              )}
            </li>
          ))}
          {found.length === 0 && <li class="text-sm text-dojo-muted">Nada con «{query}».</li>}
        </ul>
      )}
    </section>
  )
}
