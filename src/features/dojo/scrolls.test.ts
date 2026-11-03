import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRng } from '../../lib/random.ts'
import { emptyProgress } from '../progress/persist.ts'
import { deleteScroll, MAX_SCROLLS, saveScroll, strudelUrl } from './scrolls.ts'

const NOW = new Date('2026-03-10T15:00:00Z')

test('saveScroll overwrites by name and caps new ones at 20', () => {
  const rng = createRng('scrolls')
  let p = emptyProgress()
  for (let i = 0; i < MAX_SCROLLS; i++) {
    const r = saveScroll(p, `beat ${i}`, 's("bd")', NOW, rng)
    assert.ok(r.ok)
    p = r.progress
  }
  const full = saveScroll(p, 'otro', 's("sd")', NOW, rng)
  assert.equal(full.ok, false)
  const again = saveScroll(p, 'Beat 3', 's("hh")', NOW, rng)
  assert.ok(again.ok)
  assert.equal(again.progress.scrolls.length, MAX_SCROLLS)
  assert.equal(again.progress.scrolls.find((s) => s.name === 'Beat 3')?.code, 's("hh")')
  assert.equal(saveScroll(p, '  ', 'x', NOW, rng).ok, false)
  assert.equal(deleteScroll(again.progress, again.scroll.id).scrolls.length, MAX_SCROLLS - 1)
})

test('strudelUrl encodes UTF-8 code as strudel.cc expects', () => {
  const url = strudelUrl('note("c e g") // ñ')
  const hash = decodeURIComponent(url.split('#')[1] ?? '')
  const text = new TextDecoder().decode(Uint8Array.from(atob(hash), (c) => c.charCodeAt(0)))
  assert.equal(text, 'note("c e g") // ñ')
  assert.ok(url.startsWith('https://strudel.cc/#'))
})
