export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'play'

const BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 py-2 text-base font-semibold transition-colors aria-disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-dojo-torii text-dojo-ink hover:bg-dojo-torii-hover hover:shadow-glow-torii',
  secondary:
    'border-2 border-dojo-border text-dojo-text hover:border-dojo-neon hover:text-dojo-neon',
  ghost: 'text-dojo-neon hover:bg-dojo-raised',
  // Round transport button; override padding/height from BASE.
  play: 'size-14 rounded-full bg-dojo-neon text-dojo-ink hover:shadow-glow-neon',
}

export function buttonClass(variant: ButtonVariant = 'primary', extra = ''): string {
  return `${BASE} ${VARIANTS[variant]} ${extra}`.trim()
}
