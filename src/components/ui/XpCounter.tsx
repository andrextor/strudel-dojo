import { Zap } from 'lucide-preact'

export default function XpCounter({ xp }: { xp: number }) {
  return (
    <span class="inline-flex items-center gap-1.5 font-display font-bold text-dojo-gold">
      <Zap size={18} aria-hidden="true" />
      {xp.toLocaleString('es')} XP
    </span>
  )
}
