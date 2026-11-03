import { Flame } from 'lucide-preact'

export default function StreakBadge({ days }: { days: number }) {
  return (
    <span
      class={`inline-flex items-center gap-1.5 font-semibold ${days > 0 ? 'text-dojo-gold' : 'text-dojo-muted'}`}
    >
      <Flame size={18} aria-hidden="true" />
      {days === 1 ? '1 día de racha' : `${days} días de racha`}
    </span>
  )
}
