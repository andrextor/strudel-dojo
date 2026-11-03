import { CircleAlert, Info, Lightbulb, Sparkles } from 'lucide-preact'
import type { ComponentChildren } from 'preact'

export type CalloutTone = 'info' | 'hint' | 'sensei' | 'warning'

const TONE = {
  info: { Icon: Info, class: 'border-dojo-neon', icon: 'text-dojo-neon' },
  hint: { Icon: Lightbulb, class: 'border-dojo-gold', icon: 'text-dojo-gold' },
  sensei: { Icon: Sparkles, class: 'border-dojo-violet', icon: 'text-dojo-violet' },
  warning: { Icon: CircleAlert, class: 'border-dojo-warning', icon: 'text-dojo-warning' },
} as const

interface Props {
  tone?: CalloutTone
  title?: string
  children: ComponentChildren
}

export default function Callout({ tone = 'info', title, children }: Props) {
  const { Icon, class: border, icon } = TONE[tone]
  return (
    <aside class={`flex gap-3 rounded-card border-l-4 bg-dojo-surface p-4 ${border}`}>
      <Icon size={20} class={`mt-1 shrink-0 ${icon}`} aria-hidden="true" />
      <div class="space-y-1">
        {title && <p class="font-semibold">{title}</p>}
        <div class="text-dojo-muted">{children}</div>
      </div>
    </aside>
  )
}
