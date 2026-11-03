import type { ComponentChildren } from 'preact'
import { useId } from 'preact/hooks'

export interface Tab<T extends string> {
  id: T
  label: string
  icon?: ComponentChildren
}

interface Props<T extends string> {
  tabs: readonly Tab<T>[]
  value: T
  onChange: (id: T) => void
  label: string
  children: ComponentChildren // the active panel
}

// WAI-ARIA tabs with automatic activation: arrows, Home and End move and select.
export default function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  children,
}: Props<T>) {
  const base = useId()
  const go = (index: number, list: HTMLElement | null) => {
    const tab = tabs[(index + tabs.length) % tabs.length]
    if (!tab) return
    onChange(tab.id)
    list?.querySelector<HTMLElement>(`[data-tab="${tab.id}"]`)?.focus()
  }
  const current = Math.max(
    0,
    tabs.findIndex((t) => t.id === value),
  )

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        class="flex gap-1 overflow-x-auto border-b border-dojo-hairline"
        onKeyDown={(e) => {
          const list = e.currentTarget
          const moves: Record<string, number> = {
            ArrowRight: current + 1,
            ArrowLeft: current - 1,
            Home: 0,
            End: tabs.length - 1,
          }
          const next = moves[e.key]
          if (next !== undefined) {
            e.preventDefault()
            go(next, list)
          }
        }}
      >
        {tabs.map((tab) => {
          const selected = tab.id === value
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-tab={tab.id}
              id={`${base}-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              class={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold ${selected ? 'border-dojo-neon text-dojo-neon' : 'border-transparent text-dojo-muted hover:text-dojo-text'}`}
              onClick={() => onChange(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-${value}`} class="pt-4">
        {children}
      </div>
    </div>
  )
}
