import { useEffect, useRef, useState } from 'preact/hooks'
import { BELT_NAME_ES, type BeltColor } from '../curriculum/belts.ts'
import { onBeat, onPlaying } from './beat.ts'
import { POSE_ES, type Pose } from './mood.ts'

interface Props {
  belt: BeltColor
  pose: Pose
  settle?: Pose // where a reaction comes back to
  dances?: boolean // follows what the editor plays
  class?: string
}

const SETTLE_MS = 2600
const MIN_STEP_MS = 120 // fast patterns dance on every other hit instead of shaking

// A faceless figure: posture carries the whole expression, the belt is its only strong color.
export default function Apprentice({ belt, pose, settle, dances = false, class: extra }: Props) {
  const root = useRef<SVGSVGElement>(null)
  const [shown, setShown] = useState(pose)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    setShown(pose)
    if (settle === undefined || settle === pose) return
    const timer = setTimeout(() => setShown(settle), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [pose, settle])

  useEffect(() => {
    if (!dances || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let last = 0
    const stopBeat = onBeat(() => {
      const now = performance.now()
      if (now - last < MIN_STEP_MS || root.current === null) return
      last = now
      root.current.dataset.step = root.current.dataset.step === 'a' ? 'b' : 'a'
    })
    const stopPlaying = onPlaying(setPlaying)
    return () => {
      stopBeat()
      stopPlaying()
    }
  }, [dances])

  const current = playing ? 'dance' : shown
  return (
    <svg
      ref={root}
      viewBox="0 0 120 150"
      class={`apprentice ${extra ?? ''}`}
      data-pose={current}
      data-belt={belt}
      role="img"
      aria-label={`Tu aprendiz, con cinturón ${BELT_NAME_ES[belt].toLowerCase()}, ${POSE_ES[current]}`}
      style={{ '--belt': `var(--color-belt-${belt})` }}
    >
      <g class="ap-ki">
        <path d="M18 52 Q10 34 20 18" />
        <path d="M102 52 Q110 34 100 18" />
        <path d="M34 12 Q60 -4 86 12" />
      </g>
      <g class="ap-body">
        <g class="ap-leg-l">
          <path class="ap-limb" d="M53 96 L47 118" />
          <g class="ap-shin-l">
            <path class="ap-limb" d="M47 118 L44 140" />
          </g>
        </g>
        <g class="ap-leg-r">
          <path class="ap-limb" d="M67 96 L73 118" />
          <g class="ap-shin-r">
            <path class="ap-limb" d="M73 118 L76 140" />
          </g>
        </g>
        <g class="ap-upper">
          <g class="ap-arm-l">
            <path class="ap-limb" d="M46 47 L37 67" />
            <g class="ap-fore-l">
              <path class="ap-limb" d="M37 67 L34 87" />
            </g>
          </g>
          <g class="ap-arm-r">
            <path class="ap-limb" d="M74 47 L83 67" />
            <g class="ap-fore-r">
              <path class="ap-limb" d="M83 67 L86 87" />
            </g>
          </g>
          <path class="ap-gi" d="M45 42 Q60 37 75 42 L72 100 L48 100 Z" />
          <path class="ap-lapel" d="M52 40 L60 62 L68 40" />
          <rect class="ap-belt" x="46" y="80" width="28" height="8" rx="2" />
          <path class="ap-belt-tails" d="M60 86 L54 100 M60 86 L67 99" />
          <g class="ap-head">
            <circle class="ap-skull" cx="60" cy="24" r="13" />
          </g>
        </g>
      </g>
    </svg>
  )
}
