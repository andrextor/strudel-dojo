// Dojo scrolls (named snippets, max 20 per profile) and the strudel.cc share link. Pure.
import { type Rng, randomId } from '../../lib/random.ts'
import type { ProgressState, Scroll } from '../progress/types.ts'

export const MAX_SCROLLS = 20
export const SCROLL_NAME_MAX = 40

export type SaveResult =
  | { ok: true; progress: ProgressState; scroll: Scroll }
  | { ok: false; error: string }

// Saving under an existing name overwrites that scroll; a new one needs room (spec 05: a merge
// may leave more than 20, and then only overwrites are allowed until some are deleted).
export function saveScroll(
  p: ProgressState,
  name: string,
  code: string,
  now: Date,
  rng: Rng,
): SaveResult {
  const clean = name.trim().replace(/\s+/g, ' ')
  if (clean === '') return { ok: false, error: 'Ponle un nombre al pergamino.' }
  if (clean.length > SCROLL_NAME_MAX) {
    return { ok: false, error: `El nombre puede tener hasta ${SCROLL_NAME_MAX} caracteres.` }
  }
  const existing = p.scrolls.find((s) => s.name.toLowerCase() === clean.toLowerCase())
  if (!existing && p.scrolls.length >= MAX_SCROLLS) {
    return {
      ok: false,
      error: `Ya tienes ${p.scrolls.length} pergaminos (máximo ${MAX_SCROLLS}). Borra alguno para guardar uno nuevo.`,
    }
  }
  const scroll: Scroll = {
    id: existing?.id ?? randomId(rng),
    name: clean,
    code,
    updatedAt: now.toISOString(),
  }
  const others = p.scrolls.filter((s) => s.id !== scroll.id)
  return { ok: true, scroll, progress: { ...p, scrolls: [...others, scroll] } }
}

export const deleteScroll = (p: ProgressState, id: string, now = new Date()): ProgressState => ({
  ...p,
  scrolls: p.scrolls.filter((s) => s.id !== id),
  deletedScrolls: { ...p.deletedScrolls, [id]: now.toISOString() },
})

// strudel.cc reads the code from the hash as URI-encoded base64 of the UTF-8 text.
export function strudelUrl(code: string): string {
  const bytes = new TextEncoder().encode(code)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return `https://strudel.cc/#${encodeURIComponent(btoa(binary))}`
}
