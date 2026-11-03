# Design System — Strudel Dojo

Fuente de verdad del lenguaje visual. Léelo antes de cualquier trabajo de UI. Tiene la misma estructura que el de `test-maria-del-oceano`, adaptada a otro tema.

## Tema

Un dojo de noche con luces de neón: la sala de práctica donde se entrena música a medianoche y se hace live coding como en un club. Lo usan un adulto músico y su hijo: **chévere, no infantil**. Sin mascotas, sin caricaturas, sin colores pastel. El progreso son **cinturones**: cada módulo es un cinturón y cada tema aprobado es una raya.

## Reglas permanentes

1. **Mobile first** para teoría y oído (390 px); **laptop first** para editores Strudel (1280 px), que en móvil se apilan y siguen siendo usables. Comprobar en 390 px y 1440 px, sin scroll horizontal. Los touch targets miden ≥ 44 px, y los inputs ≥ 16 px con `type`, `inputmode` y `autocomplete="off"` en respuestas.
2. **Solo tokens.** Colores, radios, sombras y fuentes vienen del bloque `@theme` de `src/styles/global.css` (utilidades `bg-dojo-*`, `text-dojo-*`, `rounded-control`, `rounded-card`, `font-display`, `font-mono`). No hay hex crudo fuera de ese bloque, salvo en SVG estáticos de `public/` y en el tema de CodeMirror, que lee las variables CSS.
3. **Tema oscuro único.** `color-scheme: dark`. No hay modo claro (ver `docs/specs/00-product.md`).
4. **Teclado y foco**: todo control es alcanzable por teclado y muestra el anillo global `:focus-visible` (cian neón). Las regiones con scroll llevan `tabIndex={0}`.
5. **El movimiento respeta `prefers-reduced-motion`**: la regla global detiene las animaciones CSS, la ceremonia de cinturón muestra solo el estado final y los visuales Strudel siguen (son contenido) pero sin glow animado. Solo se animan `transform` y `opacity`.
6. **Íconos** de `lucide-preact`; los decorativos llevan `aria-hidden`. El SVG hecho a mano es solo para ilustración (teclado, diapasón, cinturones, ondas), nunca para íconos.
7. **Copy** en español neutro, en oraciones (no en mayúsculas iniciales por palabra), con "tú", y que diga qué pasa ("Entregar prueba", "Probar el código", "Pedir pista al Sensei"). Los errores dicen qué falló y cómo arreglarlo. No se asume edad ni género.
8. **El estado nunca depende solo del color**: cada badge combina ícono y texto, y cada cinturón muestra su nombre.
9. **Notación**: los nombres de nota se muestran según la preferencia del perfil (latina `Do♯` o americana `C♯`), siempre con los símbolos `♯` `♭`, nunca `#`/`b`, salvo dentro de código.

## Color

Contraste calculado con la fórmula WCAG 2.x (script en `docs/plans/P00-scaffold.md`).

| Token | Valor | Uso · contraste |
|-------|-------|-----------------|
| `dojo-ink` | `#0d0e17` | Fondo de página |
| `dojo-surface` | `#161827` | Tarjetas, paneles |
| `dojo-raised` | `#20233a` | Hover, opción seleccionada, editor |
| `dojo-text` | `#eceaf6` | Texto principal · 16.2 ink / 14.8 surface / 13.0 raised |
| `dojo-muted` | `#a3a6c2` | Texto secundario · 8.0 / 7.4 / 6.4 |
| `dojo-torii` / `-hover` | `#ff6b3d` / `#ff8a63` | Acción primaria (relleno con texto `dojo-ink` 6.8 / 8.3), acento de texto 6.8 sobre ink |
| `dojo-neon` | `#3ee6d0` | Foco, notas activas, "lo que suena", enlaces · 12.3 sobre ink; relleno con texto ink 12.3 |
| `dojo-violet` | `#a78bfa` | Strudel/código, funciones, acento secundario · 7.1 |
| `dojo-gold` | `#f5c84c` | XP, racha, estrellas, Dan · 12.1 |
| `dojo-success` | `#4ade80` | Aprobado, correcto · 11.0 |
| `dojo-warning` | `#fbbf24` | Repasar, deletreo incorrecto · 11.5 |
| `dojo-danger` | `#ff5c7a` | Incorrecto, errores · 6.5 |
| `dojo-border` | `#6a6f93` | Contornos de controles · 3.9 ink / 3.2 raised (≥ 3 para UI) |
| `dojo-hairline` | `rgb(236 234 246 / 0.08)` | Separadores decorativos |

Los fondos de estado se derivan del color al 12 % sobre surface (`color-mix(in oklab, var(--color-dojo-success) 12%, var(--color-dojo-surface))`), definidos como tokens `dojo-success-bg`, `dojo-warning-bg` y `dojo-danger-bg`.

### Cinturones

Relleno del cinturón; el texto sobre ellos es `dojo-ink`, salvo en negro.

| Token | Valor | Texto ink |
|-------|-------|-----------|
| `belt-white` | `#f1f0f7` | 17.0 |
| `belt-yellow` | `#facc15` | 12.6 |
| `belt-orange` | `#fb923c` | 8.5 |
| `belt-green` | `#34d399` | 10.0 |
| `belt-blue` | `#60a5fa` | 7.6 |
| `belt-purple` | `#c084fc` | 7.3 |
| `belt-brown` | `#c08552` | 6.2 |
| `belt-red` | `#f87171` | 7.0 |
| `belt-black` | `#2a2c3d` | Texto `dojo-text`; contorno 2 px `dojo-border` para que se distinga del fondo |
| `belt-dan` | `#f5c84c` | 12.1, con raya `belt-red` |

### Glow

`--shadow-glow-neon: 0 0 24px rgb(62 230 208 / 0.35)` y `--shadow-glow-torii: 0 0 24px rgb(255 107 61 / 0.35)`. Úsalos solo en el elemento activo (nota que suena, botón primario en hover, cinturón recién ganado), nunca en todo.

## Tipografía

- **Unbounded** (`@fontsource-variable/unbounded`, `font-display`): títulos, nombres de cinturón, puntajes. Pesos 600–800. Solo de 20 px para arriba.
- **Lexend** (`@fontsource-variable/lexend`, `font-sans`, por defecto): cuerpo, de 17 px y line-height 1.6. Se eligió por fluidez de lectura.
- **JetBrains Mono** (`@fontsource-variable/jetbrains-mono`, `font-mono`): código, mini-notation, cifrados dentro del texto (`Cmaj7`, `ii–V–I`).

## Radios y espaciado

`rounded-control` 12 px (botones, inputs, teclas de opción) · `rounded-card` 20 px (tarjetas, paneles, editor) · los pills usan `rounded-full`. La escala de espaciado es la de Tailwind; las tarjetas usan `p-5 md:p-6`.

## Botones

`buttonClass(variant)` en `src/components/ui/button.ts` (mismo patrón que la referencia), con alto mínimo de 48 px.

| Variante | Estilo |
|----------|--------|
| `primary` | `bg-dojo-torii text-dojo-ink hover:bg-dojo-torii-hover hover:shadow-glow-torii` |
| `secondary` | `border-2 border-dojo-border text-dojo-text hover:border-dojo-neon hover:text-dojo-neon` |
| `ghost` | `text-dojo-neon hover:bg-dojo-raised` |
| `play` | Redondo 56 px, `bg-dojo-neon text-dojo-ink`; ícono `Play`/`Square` |

## Elementos distintivos

- **Camino de cinturones** (inicio): un cinturón horizontal por módulo, apilados como en un tablero de dojo. El activo brilla con `glow-torii` y cada tema aprobado agrega una raya. Los bloqueados se ven con 40 % de opacidad y llevan `Lock`.
- **Ceremonia de cinturón**: al aprobar un combate, el cinturón nuevo se "anuda" (SVG con trazo animado de 1.2 s) y suenan tres acordes generados con Strudel (I–IV–I en la tonalidad del módulo). Se puede saltar y respeta reduced-motion (sin animación, con el sonido opcional).
- **Teclado** (`components/music/Keyboard.tsx`): SVG con teclas a escala real. Nota que suena = `dojo-neon` con glow; seleccionada = `dojo-violet`; correcta/incorrecta = success/danger con ícono encima.
- **Diapasón** (`components/music/Fretboard.tsx`): 6 cuerdas, afinación estándar configurable, 0–15 trastes, marcadores en 3-5-7-9-12. Mismos estados que el teclado.
- **Editor Strudel**: superficie `dojo-raised`, gutter `dojo-surface`, mini-notation en `dojo-gold`, funciones en `dojo-violet`, números en `dojo-neon`, eventos activos con fondo neón al 20 %.
- **Visual del patrón**: pianoroll con notas en `dojo-neon` y la línea de reproducción en `dojo-torii`.
- **Fondo**: una rejilla tenue (líneas `dojo-hairline` cada 32 px) con un degradado radial violeta muy sutil arriba. Es estático.

## Vocabulario de íconos

| Ícono | Significado |
|-------|-------------|
| `ArrowRight` / `ArrowLeft` | Avanzar / volver |
| `Play` / `Square` / `Volume2` | Reproducir / parar / activar sonido |
| `CircleCheck` / `CircleX` | Correcto o aprobado / incorrecto |
| `CircleDot` / `Circle` | En progreso / sin empezar |
| `Lock` | Bloqueado |
| `Swords` | Combate |
| `Target` | Kata |
| `ClipboardCheck` | Prueba |
| `Dumbbell` | Práctica |
| `Compass` | Prueba de ubicación |
| `Ear` | Oído |
| `Repeat` | Repaso espaciado |
| `Terminal` | Dojo libre |
| `Lightbulb` | Pista / explicación |
| `Sparkles` | Sensei (IA) |
| `Flame` | Racha |
| `Zap` | XP |
| `Award` | Cinturón ganado |
| `Piano` / `Guitar` | Instrumento preferido |
| `Keyboard` | Entrada MIDI |
| `Download` / `Upload` | Respaldo descargar / restaurar |
| `Users` | Perfiles |
| `LoaderCircle` | Trabajando (`motion-safe:animate-spin`) |
