import { useEffect, useId, useRef, useState } from 'preact/hooks'
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

// A soft dojo creature: squash, stretch and its eyes carry the mood; the belt is its strong color.
export default function Apprentice({ belt, pose, settle, dances = false, class: extra }: Props) {
  const root = useRef<SVGSVGElement>(null)
  const clip = useId()
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
      viewBox="0 0 120 120"
      class={`apprentice ${extra ?? ''}`}
      data-pose={current}
      data-belt={belt}
      role="img"
      aria-label={`Tu compañero del dojo, con cinturón ${BELT_NAME_ES[belt].toLowerCase()}, ${POSE_ES[current]}`}
      style={{ '--belt': `var(--color-belt-${belt})` }}
    >
      <defs>
        <clipPath id={clip}>
          <rect x="20" y="24" width="80" height="76" rx="34" />
        </clipPath>
      </defs>
      <g class="ap-ki">
        <path d="M12 58 Q4 38 14 22" />
        <path d="M108 58 Q116 38 106 22" />
        <path d="M34 10 Q60 -4 86 10" />
      </g>
      <ellipse class="ap-shadow" cx="60" cy="112" rx="34" ry="4" />
      <g class="ap-body">
        <rect class="ap-foot ap-foot-l" x="38" y="96" width="17" height="12" rx="6" />
        <rect class="ap-foot ap-foot-r" x="65" y="96" width="17" height="12" rx="6" />
        <rect class="ap-arm ap-arm-l" x="11" y="60" width="15" height="10" rx="5" />
        <rect class="ap-arm ap-arm-r" x="94" y="60" width="15" height="10" rx="5" />
        <rect class="ap-torso" x="20" y="24" width="80" height="76" rx="34" />
        <g clip-path={`url(#${clip})`}>
          <rect class="ap-belt" x="20" y="74" width="80" height="11" />
        </g>
        <path class="ap-belt-tails" d="M60 80 L51 95 M60 80 L69 94" />
        <rect class="ap-knot" x="54" y="73" width="12" height="13" rx="3" />
        <g class="ap-face">
          <g class="ap-eyes-open">
            <rect x="41" y="44" width="9" height="17" rx="4.5" />
            <rect x="70" y="44" width="9" height="17" rx="4.5" />
          </g>
          <path class="ap-eyes-happy" d="M39 56 Q45.5 44 52 56 M68 56 Q74.5 44 81 56" />
          <path class="ap-eyes-closed" d="M39 52 Q45.5 60 52 52 M68 52 Q74.5 60 81 52" />
        </g>
      </g>
    </svg>
  )
}
