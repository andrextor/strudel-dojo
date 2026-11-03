import { Flame } from 'lucide-preact'

// short: just the number, for the header (the label stays for screen readers).
export default function StreakBadge({ days, short = false }: { days: number; short?: boolean }) {
  const text = days === 1 ? '1 día de racha' : `${days} días de racha`
  return (
    <span
      class={`inline-flex items-center gap-1.5 font-semibold ${days > 0 ? 'text-dojo-gold' : 'text-dojo-muted'}`}
    >
      <Flame size={18} aria-hidden="true" />
      {short ? (
        <>
          <span aria-hidden="true">{days}</span>
          <span class="sr-only">{text}</span>
        </>
      ) : (
        text
      )}
    </span>
  )
}
