import { Check, X } from 'lucide-preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { degreeLabel, keyboardRange, spellingsFor } from '../../features/theory/instruments.ts'
import { formatNote, spokenNote } from '../../features/theory/notes.ts'
import {
  type InstrumentProps,
  type KeyState,
  keyAttrs,
  SpellingPicker,
  STATE_FILL,
  STATE_WORD,
  usePress,
} from './instrument.tsx'

interface Props extends InstrumentProps {
  low?: number
  high?: number
  labels?: 'name' | 'degree' | 'none'
  tonic?: string
}

const W = 28 // white key width (SVG units)
const H = 140
const BW = 17
const BH = 88

// C3–B4 on phones, C2–C6 from md up; explicit low/high win.
function useDefaultRange(): [number, number] {
  const wide = () => typeof matchMedia === 'function' && matchMedia('(min-width: 768px)').matches
  const [isWide, setWide] = useState(wide)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia('(min-width: 768px)')
    const change = () => setWide(query.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])
  return isWide ? [36, 84] : [48, 71]
}

export default function Keyboard(props: Props) {
  const { mode, notation, states, labels = 'none', tonic = 'C', label } = props
  const [defaultLow, defaultHigh] = useDefaultRange()
  const keys = keyboardRange(props.low ?? defaultLow, props.high ?? defaultHigh)
  const svg = useRef<SVGSVGElement>(null)
  const { picker, press, choose, close } = usePress(props)
  const [focus, setFocus] = useState<number | null>(null)
  const interactive = mode !== 'display'

  let whiteIndex = 0
  const placed = keys.map((key) => {
    if (key.isBlack) return { key, x: whiteIndex * W - BW / 2 }
    return { key, x: whiteIndex++ * W }
  })
  const width = whiteIndex * W
  const focused = focus ?? placed.find((p) => !p.key.isBlack)?.key.midi ?? null

  const focusKey = (midi: number) => {
    setFocus(midi)
    svg.current?.querySelector<SVGElement>(`[data-midi="${midi}"]`)?.focus()
  }
  const afterPicker = (fn: () => void) => () => {
    fn()
    if (focused !== null) focusKey(focused)
  }

  const onKeyDown = (e: KeyboardEvent, midi: number, x: number) => {
    const first = keys[0]?.midi ?? midi
    const last = keys.at(-1)?.midi ?? midi
    const moves: Record<string, number> = {
      ArrowRight: Math.min(last, midi + 1),
      ArrowLeft: Math.max(first, midi - 1),
      ArrowUp: Math.min(last, midi + 12),
      ArrowDown: Math.max(first, midi - 12),
      Home: first,
      End: last,
    }
    const target = moves[e.key]
    if (target !== undefined) {
      e.preventDefault()
      focusKey(target)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      press(midi, String(midi), x)
    }
  }

  const renderKey = ({ key, x }: (typeof placed)[number]) => {
    const at = String(key.midi)
    const state: KeyState | undefined = states?.get(at)
    const w = key.isBlack ? BW : W
    const h = key.isBlack ? BH : H
    const base = key.isBlack ? 'fill-key-black' : 'fill-key-white'
    const octave = key.name.match(/-?\d+$/)?.[0] ?? ''
    const spoken = spellingsFor(key.midi)
      .map((pc) => spokenNote(`${pc}${octave}`, notation))
      .join(' o ')
    const text =
      labels === 'name'
        ? formatNote(spellingsFor(key.midi)[0] ?? key.pitchClass, notation)
        : labels === 'degree'
          ? degreeLabel(key.midi, tonic)
          : ''
    const textFill = state ? 'fill-dojo-ink' : key.isBlack ? 'fill-key-white' : 'fill-belt-on'
    const Icon = state === 'correct' ? Check : state === 'wrong' ? X : null
    const xPercent = ((x + w / 2) / width) * 100
    return (
      <g
        key={at}
        data-midi={key.midi}
        {...keyAttrs(interactive, {
          tabbable: focused === key.midi,
          pressed: mode === 'play' ? undefined : state !== undefined && state !== 'active',
          label: `${spoken}${state ? `, ${STATE_WORD[state]}` : ''}`,
          onPress: () => {
            setFocus(key.midi)
            press(key.midi, at, xPercent)
          },
          onKeyDown: (e) => onKeyDown(e, key.midi, xPercent),
        })}
        class={`group outline-none ${interactive ? 'cursor-pointer' : ''}`}
      >
        <rect
          x={x + 0.5}
          y={0.5}
          width={w - 1}
          height={h}
          rx={key.isBlack ? 3 : 4}
          class={`${state ? STATE_FILL[state] : base} stroke-dojo-border group-focus-visible:stroke-dojo-neon group-focus-visible:[stroke-width:3] ${interactive && !state ? (key.isBlack ? 'hover:fill-dojo-raised' : 'hover:fill-dojo-muted') : ''}`}
        />
        {Icon && (
          <Icon
            x={x + w / 2 - 8}
            y={h - (text ? 42 : 24)}
            width={16}
            height={16}
            strokeWidth={3}
            class="text-dojo-ink"
            aria-hidden="true"
          />
        )}
        {text && (
          <text
            x={x + w / 2}
            y={h - 8}
            text-anchor="middle"
            class={`${textFill} pointer-events-none font-sans text-[10px] font-semibold`}
          >
            {text}
          </text>
        )}
      </g>
    )
  }

  return (
    <div class="relative w-full">
      <svg
        ref={svg}
        viewBox={`0 0 ${width} ${H + 1}`}
        role={interactive ? 'group' : 'img'}
        aria-label={label}
        class="block h-auto w-full select-none"
      >
        {placed.filter((p) => !p.key.isBlack).map(renderKey)}
        {placed.filter((p) => p.key.isBlack).map(renderKey)}
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
  )
}
