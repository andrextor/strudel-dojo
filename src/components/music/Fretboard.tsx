import { Check, X } from 'lucide-preact'
import { useRef, useState } from 'preact/hooks'
import { Note } from 'tonal'
import { fretToNote, STANDARD_TUNING, spellingsFor } from '../../features/theory/instruments.ts'
import { formatNote, spokenNote } from '../../features/theory/notes.ts'
import {
  type InstrumentProps,
  keyAttrs,
  SpellingPicker,
  STATE_FILL,
  STATE_WORD,
  usePress,
} from './instrument.tsx'

interface Props extends InstrumentProps {
  tuning?: readonly string[]
  frets?: number
  lefty?: boolean
  labels?: 'name' | 'none'
}

const OPEN = 44 // width of the open-string column, left of the nut
const FRET = 56
const GAP = 44 // between strings: keeps every target 44 px tall
const TOP = 26
const MARKERS = [3, 5, 7, 9, 15]

export default function Fretboard(props: Props) {
  const { mode, notation, states, tuning = STANDARD_TUNING, frets = 15, lefty = false } = props
  const { labels = 'none', label } = props
  const svg = useRef<SVGSVGElement>(null)
  const { picker, press, choose, close } = usePress(props)
  const [focus, setFocus] = useState('0:0')
  const interactive = mode !== 'display'
  const strings = tuning.length
  const width = OPEN + frets * FRET + 12
  const height = TOP + (strings - 1) * GAP + 40
  const flip = (x: number) => (lefty ? width - x : x)
  const fretX = (fret: number) => flip(fret === 0 ? OPEN / 2 : OPEN + (fret - 0.5) * FRET)
  const lineX = (fret: number) => flip(OPEN + fret * FRET)
  // Highest string on top, like a tab.
  const stringY = (s: number) => TOP + (strings - 1 - s) * GAP

  const focusAt = (at: string) => {
    setFocus(at)
    svg.current?.querySelector<SVGElement>(`[data-at="${at}"]`)?.focus()
  }
  const afterPicker = (fn: () => void) => () => {
    fn()
    focusAt(focus)
  }

  const onKeyDown = (e: KeyboardEvent, s: number, f: number, midi: number, x: number) => {
    const right = lefty ? -1 : 1
    const moves: Record<string, [number, number]> = {
      ArrowRight: [s, f + right],
      ArrowLeft: [s, f - right],
      ArrowUp: [s + 1, f],
      ArrowDown: [s - 1, f],
      Home: [s, 0],
      End: [s, frets],
    }
    const move = moves[e.key]
    if (move) {
      e.preventDefault()
      const [ns, nf] = move
      focusAt(`${Math.min(strings - 1, Math.max(0, ns))}:${Math.min(frets, Math.max(0, nf))}`)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      press(midi, `${s}:${f}`, x)
    }
  }

  const cells = []
  for (let s = 0; s < strings; s++) {
    for (let f = 0; f <= frets; f++) {
      const name = fretToNote(s, f, tuning)
      const midi = name === null ? null : Note.midi(name)
      if (name === null || midi === null) continue
      const at = `${s}:${f}`
      const state = states?.get(at)
      const cx = fretX(f)
      const cy = stringY(s)
      const w = f === 0 ? OPEN : FRET
      const octave = Note.get(name).oct ?? ''
      const spoken = spellingsFor(midi)
        .map((pc) => spokenNote(`${pc}${octave}`, notation))
        .join(' o ')
      const where = `cuerda ${strings - s}, ${f === 0 ? 'al aire' : `traste ${f}`}`
      const Icon = state === 'correct' ? Check : state === 'wrong' ? X : null
      const xPercent = (cx / width) * 100
      cells.push(
        <g
          key={at}
          data-at={at}
          {...keyAttrs(interactive, {
            tabbable: focus === at,
            pressed: mode === 'play' ? undefined : state !== undefined && state !== 'active',
            label: `${spoken}, ${where}${state ? `, ${STATE_WORD[state]}` : ''}`,
            onPress: () => {
              setFocus(at)
              press(midi, at, xPercent)
            },
            onKeyDown: (e) => onKeyDown(e, s, f, midi, xPercent),
          })}
          class={`group outline-none ${interactive ? 'cursor-pointer' : ''}`}
        >
          <rect
            x={cx - w / 2}
            y={cy - GAP / 2}
            width={w}
            height={GAP}
            class={`fill-transparent ${interactive ? 'hover:fill-dojo-raised/60' : ''}`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={14}
            class={`${state ? STATE_FILL[state] : 'fill-transparent'} group-focus-visible:stroke-dojo-neon group-focus-visible:[stroke-width:3]`}
          />
          {Icon && (
            <Icon
              x={cx - 8}
              y={cy - 8}
              width={16}
              height={16}
              strokeWidth={3}
              class="text-dojo-ink"
              aria-hidden="true"
            />
          )}
          {!Icon && state && labels === 'name' && (
            <text
              x={cx}
              y={cy + 4}
              text-anchor="middle"
              class="pointer-events-none fill-dojo-ink font-sans text-[11px] font-semibold"
            >
              {formatNote(spellingsFor(midi)[0] ?? name, notation)}
            </text>
          )}
        </g>,
      )
    }
  }

  const boardTop = stringY(strings - 1)
  const boardBottom = stringY(0)
  const mid = (boardTop + boardBottom) / 2

  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: the scroll region must be reachable by keyboard
    <div tabIndex={0} class="overflow-x-auto rounded-control">
      <div class="relative w-max">
        <svg
          ref={svg}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role={interactive ? 'group' : 'img'}
          aria-label={label}
          class="block max-w-none select-none"
        >
          {MARKERS.filter((m) => m <= frets).map((m) => (
            <circle key={m} cx={fretX(m)} cy={mid} r={6} class="fill-dojo-raised" />
          ))}
          {frets >= 12 && (
            <>
              <circle cx={fretX(12)} cy={mid - GAP} r={6} class="fill-dojo-raised" />
              <circle cx={fretX(12)} cy={mid + GAP} r={6} class="fill-dojo-raised" />
            </>
          )}
          {Array.from({ length: frets + 1 }, (_, f) => (
            <line
              key={f}
              x1={lineX(f)}
              x2={lineX(f)}
              y1={boardTop}
              y2={boardBottom}
              class={
                f === 0
                  ? 'stroke-dojo-text [stroke-width:5]'
                  : 'stroke-dojo-border [stroke-width:2]'
              }
            />
          ))}
          {tuning.map((_, s) => (
            <line
              key={s}
              x1={flip(OPEN)}
              x2={lineX(frets)}
              y1={stringY(s)}
              y2={stringY(s)}
              class="stroke-dojo-muted"
              style={{ strokeWidth: 1 + (strings - s) * 0.35 }}
            />
          ))}
          {Array.from({ length: frets }, (_, i) => i + 1).map((f) => (
            <text
              key={f}
              x={fretX(f)}
              y={height - 8}
              text-anchor="middle"
              class="fill-dojo-muted font-sans text-[12px]"
            >
              {f}
            </text>
          ))}
          {cells}
        </svg>
        {picker && (
          <SpellingPicker
            picker={picker}
            notation={notation}
            onChoose={(name) => afterPicker(() => choose(name))()}
            onClose={afterPicker(close)}
          />
        )}
      </div>
    </div>
  )
}
