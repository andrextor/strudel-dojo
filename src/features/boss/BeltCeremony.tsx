import { Award, Volume2 } from 'lucide-preact'
import { useEffect, useRef } from 'preact/hooks'
import { buttonClass } from '../../components/ui/button.ts'
import Apprentice from '../apprentice/Apprentice.tsx'
import { BELT_NAME_ES, type BeltColor } from '../curriculum/belts.ts'
import { playOnce } from '../strudel/engine.ts'
import { cadence } from './cadence.ts'

const FILL: Record<BeltColor, string> = {
  white: 'stroke-belt-white',
  yellow: 'stroke-belt-yellow',
  orange: 'stroke-belt-orange',
  green: 'stroke-belt-green',
  blue: 'stroke-belt-blue',
  purple: 'stroke-belt-purple',
  brown: 'stroke-belt-brown',
  red: 'stroke-belt-red',
  black: 'stroke-belt-black',
  dan: 'stroke-belt-dan',
}

interface Props {
  belt: BeltColor
  order: number
  next: string | null // what comes next, e.g. "Ahora vas por el cinturón amarillo."
  onContinue: () => void
}

export default function BeltCeremony({ belt, order, next, onContinue }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const play = () => void playOnce(cadence(order), { slow: 2 })

  useEffect(() => {
    dialog.current?.showModal()
    // The chords are part of the moment, but with reduced motion they wait for the button.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) play()
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-labelledby="ceremony-title"
      class="m-auto w-[min(32rem,calc(100%-2rem))] rounded-card border-2 border-dojo-gold bg-dojo-surface p-6 text-dojo-text backdrop:bg-dojo-ink/80"
      onClose={onContinue}
    >
      <div class="space-y-5 text-center">
        <Apprentice belt={belt} pose="bow" class="mx-auto h-28 w-24" />
        <svg viewBox="0 0 240 120" class="mx-auto h-32 w-64" aria-hidden="true">
          <path d="M10 60 H230" class={`${FILL[belt]} [stroke-width:22]`} fill="none" />
          <path
            d="M120 40 C95 40 95 80 120 80 C145 80 145 40 120 40 Z M112 78 L96 112 M128 78 L146 112"
            pathLength={1}
            class={`knot ${FILL[belt]} [stroke-linecap:round] [stroke-width:12]`}
            fill="none"
          />
          {belt === 'black' && (
            <path d="M10 60 H230" class="stroke-dojo-border [stroke-width:2]" fill="none" />
          )}
        </svg>
        <p class="flex items-center justify-center gap-2 text-sm font-semibold text-dojo-gold">
          <Award size={18} aria-hidden="true" />
          Cinturón ganado
        </p>
        <h2 id="ceremony-title" class="font-display text-3xl font-extrabold">
          Cinturón {BELT_NAME_ES[belt].toLowerCase()}
        </h2>
        {next && <p class="text-dojo-muted">{next}</p>}
        <div class="flex flex-wrap justify-center gap-3">
          <button type="button" class={buttonClass('secondary')} onClick={play}>
            <Volume2 size={18} aria-hidden="true" />
            Escuchar otra vez
          </button>
          <button
            type="button"
            class={buttonClass('primary')}
            onClick={() => dialog.current?.close()}
          >
            Continuar
          </button>
        </div>
      </div>
    </dialog>
  )
}
