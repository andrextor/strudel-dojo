import { BELT_NAME_ES, type BeltColor } from '../../features/curriculum/belts.ts'

const FILL: Record<BeltColor, string> = {
  white: 'fill-belt-white',
  yellow: 'fill-belt-yellow',
  orange: 'fill-belt-orange',
  green: 'fill-belt-green',
  blue: 'fill-belt-blue',
  purple: 'fill-belt-purple',
  brown: 'fill-belt-brown',
  red: 'fill-belt-red',
  black: 'fill-belt-black stroke-dojo-border [stroke-width:2]',
  dan: 'fill-belt-dan',
}

interface Props {
  belt: BeltColor
  stripes?: number // approved topics, 0–4
  max?: number
  showName?: boolean
}

// A belt with its tab at the end; each approved topic adds a stripe on the tab.
export default function BeltBadge({ belt, stripes = 0, max = 4, showName = true }: Props) {
  const name = BELT_NAME_ES[belt]
  const tab = belt === 'black' || belt === 'dan' ? 'fill-belt-red' : 'fill-belt-black'
  const stripe = belt === 'black' || belt === 'dan' ? 'fill-belt-white' : 'fill-belt-dan'
  return (
    <span class="inline-flex items-center gap-3">
      <svg viewBox="0 0 120 24" class="h-6 w-30 shrink-0" aria-hidden="true">
        <rect x="1" y="1" width="118" height="22" rx="5" class={FILL[belt]} />
        <rect x="84" y="1" width="28" height="22" class={tab} />
        {Array.from({ length: Math.min(stripes, max) }, (_, i) => (
          <rect key={i} x={88 + i * 6} y="1" width="3" height="22" class={stripe} />
        ))}
      </svg>
      {showName ? (
        <span class="font-display text-base font-semibold">
          Cinturón {name.toLowerCase()}
          <span class="sr-only">
            , {stripes} de {max} rayas
          </span>
        </span>
      ) : (
        <span class="sr-only">
          Cinturón {name.toLowerCase()}, {stripes} de {max} rayas
        </span>
      )}
    </span>
  )
}
