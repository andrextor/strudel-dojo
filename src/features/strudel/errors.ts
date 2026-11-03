// Turns Strudel / acorn / runtime errors into actionable Spanish messages with a line number.
import type { DojoError } from './types.ts'

export function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min((row[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost)
    }
    prev = row
  }
  return prev[b.length] ?? 0
}

// Closest known name within a distance that still reads as a typo (1 for short names, 2 else).
export function suggest(name: string, known: readonly string[]): string | null {
  const max = name.length <= 4 ? 1 : 2
  let best: string | null = null
  let bestDistance = max + 1
  for (const candidate of known) {
    if (candidate === name) continue // a known name that is still undefined: no typo to fix
    const d = levenshtein(name.toLowerCase(), candidate.toLowerCase())
    if (d < bestDistance) {
      best = candidate
      bestDistance = d
    }
  }
  return best
}

const errorText = (err: unknown): string =>
  err instanceof Error ? err.message : typeof err === 'string' ? err : String(err)

// First line where `name` appears as a whole identifier, ignoring the content of strings.
function lineOf(code: string, name: string): number | null {
  const pattern = new RegExp(`(^|[^\\w$])${name.replace(/[$]/g, '\\$')}(?![\\w$])`)
  const lines = code.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(stripStrings(lines[i] ?? ''))) return i + 1
  }
  return null
}

const stripStrings = (line: string) => line.replace(/(["'`])(?:\\.|(?!\1).)*\1?/g, '""')

// Which delimiter is left open on the whole code (outside strings), if any.
function unbalanced(code: string): string | null {
  const quotes = code.replace(/\\./g, '').match(/"/g)?.length ?? 0
  if (quotes % 2 === 1) return 'unas comillas `"`'
  const outside = code
    .split('\n')
    .map(stripStrings)
    .join('\n')
    .replace(/\/\/.*$/gm, '')
  const count = (c: string) => outside.split(c).length - 1
  if (count('(') > count(')')) return 'un paréntesis `)`'
  if (count('(') < count(')')) return null
  if (count('[') > count(']')) return 'un corchete `]`'
  if (count('{') > count('}')) return 'una llave `}`'
  return null
}

// Which bracket a mini-notation string on that line leaves open.
function miniHint(line: string): string {
  const strings = line.match(/"([^"]*)"?/g) ?? []
  for (const s of strings) {
    const body = s.replace(/^"|"$/g, '')
    for (const [open, close] of [
      ['[', ']'],
      ['<', '>'],
      ['{', '}'],
      ['(', ')'],
    ] as const) {
      const diff = body.split(open).length - body.split(close).length
      if (diff > 0) return ` Falta cerrar \`${close}\` dentro de las comillas.`
      if (diff < 0) return ` Sobra un \`${close}\` dentro de las comillas.`
    }
  }
  return ' Revisa que cada `[ ]` y `< >` esté cerrado y que no haya símbolos sueltos.'
}

export function toDojoError(err: unknown, code: string, known: readonly string[] = []): DojoError {
  const raw = errorText(err)

  const mini = raw.match(/^\[mini\] parse error at line (\d+)/)
  if (mini) {
    const line = Number(mini[1])
    return {
      message: `La mini-notation de la línea ${line} no se entiende.${miniHint(code.split('\n')[line - 1] ?? '')}`,
      line,
      raw,
    }
  }

  const syntax = raw.match(/\((\d+):(\d+)\)\s*$/)
  if (syntax) {
    const line = Number(syntax[1])
    const open = unbalanced(code)
    const message = open
      ? `Falta cerrar ${open}. El código se corta en la línea ${line}.`
      : `Hay un error de escritura en la línea ${line}: revisa comas, paréntesis y puntos.`
    return { message, line, raw }
  }

  const notDefined = raw.match(/^(\w+) is not defined/)
  if (notDefined?.[1]) {
    const name = notDefined[1]
    const hint = suggest(name, known)
    return {
      message: `\`${name}\` no existe${hint ? `, ¿quisiste decir \`${hint}\`?` : '.'}`,
      line: lineOf(code, name),
      raw,
    }
  }

  const notFunction = raw.match(/\.?(\w+) is not a function/)
  if (notFunction?.[1]) {
    const name = notFunction[1]
    const hint = suggest(name, known)
    return {
      message: `\`${name}\` no es una función de Strudel${hint ? `, ¿quisiste decir \`${hint}\`?` : '.'}`,
      line: lineOf(code, name),
      raw,
    }
  }

  return { message: `El código falló al ejecutarse: ${raw}`, line: null, raw }
}
