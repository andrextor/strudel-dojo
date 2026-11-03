import { Circle, CircleCheck, CircleDot, CircleX, Lock, Repeat } from 'lucide-preact'

export type Status = 'passed' | 'review' | 'failed' | 'in-progress' | 'not-started' | 'locked'

const STATUS = {
  passed: { Icon: CircleCheck, text: 'Aprobado', class: 'bg-dojo-success-bg text-dojo-success' },
  review: { Icon: Repeat, text: 'Repasar', class: 'bg-dojo-warning-bg text-dojo-warning' },
  failed: { Icon: CircleX, text: 'Incorrecto', class: 'bg-dojo-danger-bg text-dojo-danger' },
  'in-progress': { Icon: CircleDot, text: 'En progreso', class: 'bg-dojo-raised text-dojo-neon' },
  'not-started': { Icon: Circle, text: 'Sin empezar', class: 'bg-dojo-raised text-dojo-muted' },
  locked: { Icon: Lock, text: 'Bloqueado', class: 'bg-dojo-raised text-dojo-muted' },
} as const

// State is never color alone: icon + text, always.
export default function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const { Icon, text, class: tone } = STATUS[status]
  return (
    <span
      class={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${tone}`}
    >
      <Icon size={16} aria-hidden="true" />
      {label ?? text}
    </span>
  )
}
