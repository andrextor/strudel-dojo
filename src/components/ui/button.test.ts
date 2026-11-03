import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buttonClass } from './button.ts'

test('primary is the default variant', () => {
  assert.equal(buttonClass(), buttonClass('primary'))
})

test('each variant carries its own token classes', () => {
  assert.match(buttonClass('primary'), /bg-dojo-torii/)
  assert.match(buttonClass('secondary'), /border-dojo-border/)
  assert.match(buttonClass('ghost'), /text-dojo-neon/)
  assert.match(buttonClass('play'), /rounded-full/)
})

test('extra classes are appended and trimmed', () => {
  assert.equal(buttonClass('ghost', 'w-full').endsWith('w-full'), true)
  assert.equal(buttonClass('ghost').endsWith(' '), false)
})
