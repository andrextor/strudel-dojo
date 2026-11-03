// Fails the build if any declared color pair drops below its WCAG threshold,
// in BOTH the dark and the light theme. Hex values are read from global.css,
// the single source of truth: the @theme block holds dark, the
// :root[data-theme="light"] block holds light.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const cssPath = fileURLToPath(new URL('../src/styles/global.css', import.meta.url))
const css = readFileSync(cssPath, 'utf8')

function tokensIn(block) {
  const map = new Map()
  for (const [, name, hex] of block.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    map.set(name, hex)
  }
  return map
}

const themeBlock = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
const lightBlock = css.match(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
const base = tokensIn(themeBlock)
// Light overrides a subset; fall back to base for anything it doesn't redefine (belts).
const light = new Map(base)
for (const [k, v] of tokensIn(lightBlock)) light.set(k, v)

function luminance(hex) {
  const channels = [0, 2, 4].map((i) => Number.parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
  const linear = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function ratio(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const TEXT = 4.5
const UI = 3

// Pairs that depend on the theme: checked against both token maps.
const accents = [
  'dojo-torii',
  'dojo-neon',
  'dojo-violet',
  'dojo-gold',
  'dojo-success',
  'dojo-warning',
  'dojo-danger',
]
const themedPairs = [
  ['dojo-text', 'dojo-ink', TEXT],
  ['dojo-text', 'dojo-surface', TEXT],
  ['dojo-text', 'dojo-raised', TEXT],
  ['dojo-muted', 'dojo-ink', TEXT],
  ['dojo-muted', 'dojo-surface', TEXT],
  ['dojo-muted', 'dojo-raised', TEXT],
  ...accents.flatMap((a) => [
    [a, 'dojo-ink', TEXT],
    [a, 'dojo-surface', TEXT],
  ]),
  ['dojo-border', 'dojo-ink', UI],
  ['dojo-border', 'dojo-surface', UI],
  ['dojo-border', 'dojo-raised', UI],
]

// Belts are theme-independent; checked once. belt-on is the dark text on the
// light-colored belts; the black belt carries belt-white text.
const belts = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'red', 'dan']
const fixedPairs = [
  ...belts.map((b) => ['belt-on', `belt-${b}`, TEXT]),
  ['belt-white', 'belt-black', TEXT],
]

const failures = []
function check(map, themeName, pairs) {
  for (const [fg, bg, min] of pairs) {
    const fgHex = map.get(fg)
    const bgHex = map.get(bg)
    if (!fgHex || !bgHex) {
      failures.push(`[${themeName}] missing token: ${fg} or ${bg}`)
      continue
    }
    const value = ratio(fgHex, bgHex)
    if (value < min) {
      failures.push(`[${themeName}] ${fg} on ${bg}: ${value.toFixed(2)} < ${min}`)
    }
  }
}

check(base, 'dark', themedPairs)
check(light, 'light', themedPairs)
check(base, 'belts', fixedPairs)

if (failures.length > 0) {
  console.error('Contrast check failed:')
  for (const line of failures) console.error(`  ${line}`)
  process.exit(1)
}

const total = themedPairs.length * 2 + fixedPairs.length
console.log(`Contrast OK: ${total} pairs meet WCAG thresholds across both themes.`)
