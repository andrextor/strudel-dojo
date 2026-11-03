import type { renderAbc } from 'abcjs'
import { useEffect, useRef, useState } from 'preact/hooks'

type Render = typeof renderAbc

// abcjs is CommonJS: depending on the bundler interop the API sits on the module or on default.
async function loadRender(): Promise<Render> {
  const mod: Record<string, unknown> = await import('abcjs')
  const lib = 'renderAbc' in mod ? mod : mod.default
  if (typeof lib === 'object' && lib !== null && 'renderAbc' in lib) {
    return lib.renderAbc as Render
  }
  throw new Error('abcjs without renderAbc')
}

interface Props {
  abc: string // ABC notation; the clef goes in it (`K:C clef=bass` for the F clef)
  label: string // what the staff shows, for screen readers
}

// Read-only staff. abcjs (~300 kB) loads on first render; it draws with currentColor, so the
// notes follow the theme's text color.
export default function Staff({ abc, label }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    loadRender().then(
      (render) => {
        if (alive && host.current) {
          render(host.current, abc, {
            responsive: 'resize',
            foregroundColor: 'currentColor',
            paddingtop: 0,
            paddingbottom: 0,
            paddingleft: 0,
            paddingright: 0,
            staffwidth: 360,
          })
        }
      },
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [abc])

  return (
    <figure class="rounded-card bg-dojo-surface p-4 text-dojo-text">
      <div ref={host} role="img" aria-label={label} class="mx-auto max-w-md" />
      {failed && <p class="text-sm text-dojo-danger">No se pudo cargar la partitura.</p>}
    </figure>
  )
}
