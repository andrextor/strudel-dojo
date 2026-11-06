# 09 · Dos cursos: Teoría y Strudel

Este spec define la separación de la app en dos cursos. **Aplicado** en P13–P16 (rama `feat/two-courses`): los specs 00–07 y `DESIGN.md` ya reflejan el cambio, y este documento queda como fuente de las reglas de etapas, registro de la decisión y clasificación de katas.

## Por qué

| Problema de hoy | Evidencia | Cómo se resuelve |
|-----------------|-----------|------------------|
| La teoría depende de Strudel | Tema aprobado = prueba **y** katas (spec 05, regla 2). Módulo aprobado = temas **y** combate. La teoría se hace en el celular y Strudel en la laptop (spec 00). | La teoría se aprueba con pruebas y examen. Ningún paso de teoría pide código. |
| La ubicación se salta Strudel | Aprobar la ubicación de M01 da por hechas sus 12 katas, y la mezcla de la prueba casi no evalúa Strudel. M02 asume esas katas. | La ubicación solo salta teoría. El curso Strudel sigue su propia cadena desde S01. |
| Strudel no tiene orden propio | El diseño de sonido está en M10, detrás de nueve cinturones, aunque no necesita armonía. Algunas parejas tema/función son forzadas (nombres de notas con `s("bd hh sd hh")`). | Ritmo y sonido abren el curso, sin requisitos de teoría. |
| Teoría y código comparten pantalla | 34 de 40 lecciones tienen una sección `## Strudel`, y otras 6 mezclan código sin encabezado. | Las lecciones de teoría no enseñan código. Cada unidad de Strudel tiene su propia lección. |

## Qué no cambia

- Una sola app, un solo perfil, un solo `ProgressState` y un solo respaldo. **No hay migración de datos**: `persist.ts` y la versión del estado no cambian.
- Los ids de katas y combates existentes (`M02-T01-K1`, `M02-BOSS`), porque son las claves de `progress.katas` y `progress.bosses`.
- Las rutas `/m/...` de teoría, salvo `combate`, `kata` y `ubicacion`.
- `/repaso`, `/oido`, `/diapason`, `/dojo` y `/progreso` siguen existiendo. `/oido` abre antes, porque los temas se aprueban antes.
- `<Listen>` sigue en las lecciones de teoría: Strudel es el motor de audio, no el tema.

## Fuera de alcance

| No se hace | Motivo |
|------------|--------|
| Supabase, cuentas o sincronización | Decisión del dueño: va después de la separación. Nada de este spec lo bloquea, porque el formato de `ProgressState` no cambia. |
| Prueba de ubicación en Strudel | Un saltador de etapas pide generar preguntas de código. Se añade si S01–S02 resultan repetitivas para alguien que ya usa Strudel. |
| Redirecciones de las URL viejas de katas y combates | La app tiene dos usuarios y esas rutas no están guardadas en el progreso. Una URL vieja cae en la página 404. |
| Ceremonia de etapa en Strudel | La revisión del Sensei ya cierra el combate. La ceremonia sigue siendo de cinturones. |
| Repaso espaciado de katas | `/repaso` no repite katas. Sí incluye las preguntas de `practice` de las unidades abiertas (`sound-design`, `performance-signal`). |

## Estructura final

```
Curso Teoría (/m/...)                 Curso Strudel (/strudel/...)
10 módulos = 10 cinturones            12 etapas
  4 temas por módulo                    2–4 unidades por etapa
    lección · práctica · prueba           lección · katas (· práctica)
  examen de cinturón                    combate
```

El vínculo entre cursos es de una sola dirección: **una unidad de Strudel puede pedir temas de teoría; la teoría nunca pide nada de Strudel.**

## Curso Teoría

### Reglas

Reemplazan las reglas 2, 4, 5 y 6 del spec 05. Las demás siguen igual.

- **T1. Tema aprobado** = prueba aprobada.
- **T2. Examen de cinturón.** Son las 20 preguntas de la actual prueba de ubicación, disponibles en cualquier módulo desbloqueado y no aprobado. Una sola ruta, `/m/[module]/examen`, con dos umbrales:
  - con **todos** los temas aprobados, se aprueba con `passPercent` (80);
  - con temas pendientes, se aprueba con `skipPercent` (90), y eso salta el módulo como hoy lo hace la ubicación.
  - El umbral se decide al entregar, no al empezar.
- **T3. Módulo aprobado** = examen aprobado, **o** todos los temas aprobados y el combate `Mnn-BOSS` aprobado. La segunda opción conserva los cinturones ya ganados, y además es un camino permanente: quien hace los temas y gana el combate en Strudel no tiene que presentar el examen. El examen sigue siendo el camino que no pide código.
- **T4. Módulo desbloqueado** = su `prerequisite` está aprobado (sin cambios).
- **T5. Aprobado por examen.** Si el examen se aprueba con temas pendientes, esos temas quedan `passed_by_placement` (sin cambios de nombre).

- **T6. Ceremonia.** Un módulo puede quedar aprobado de tres formas: al entregar el examen, al ganar el combate o al aprobar la última prueba de tema con el combate ya ganado (S03 y S12 no piden todos los temas de su módulo). Por eso la ceremonia no se ata a una pantalla: `newlyPassedModule(before, after, curriculum)` compara dos estados y devuelve el módulo recién aprobado o `null`. La usan `TestView` y `BossView` al guardar. No va en `/resultado`, porque esa página se puede volver a abrir.

`TestAttempt.kind` sigue siendo `'placement'` en el almacenamiento para no migrar datos. En la UI y en el copy se llama "examen".

Cada regla nueva es más permisiva que la anterior: lo que estaba aprobado sigue aprobado. Un tema con prueba aprobada y katas pendientes pasa a estar aprobado.

### Cambios de contenido

- `modules/mNN.json` pierde `topics[].katas` y `boss`. `placement` pasa a llamarse `exam`:

  ```jsonc
  "exam": { "questions": 20, "skipPercent": 90, "passPercent": 80, "mix": [ /* la mezcla actual */ ] }
  ```

  `exam` es obligatorio en módulos `ready`, porque sin él no se gana el cinturón.
- Las lecciones de teoría no tienen `<Example>` ni `<StrudelRef>`, ni encabezados `## Strudel`. Un test lo exige.
- `<Listen>` oculta el código por defecto. Las lecciones de Strudel pasan `showCode`.
- `rhythm-match` deja de mostrar mini-notation: las opciones se dibujan con `●` y `·`. El audio y la calificación por índice no cambian, así que los intentos guardados siguen siendo válidos.
- Las pestañas de `TopicPanel` quedan en Práctica · Prueba. Debajo aparece "Practícalo en Strudel" con las unidades que piden ese tema. La página calcula esa lista en build y le pasa a la isla solo título y enlace. Si ninguna unidad lo pide (M10-T03), el bloque no se muestra.

### M10: los temas que eran de Strudel

M10-T03 y M10-T04 hoy preguntan por funciones (`¿Qué hace \`lpf\` en Strudel?`). M10 conserva sus 4 temas, para no tocar el esquema ni las rayas, y esos dos se reescriben como teoría:

| Tema | Pasa a ser | Generador nuevo | Skill nueva |
|------|------------|-----------------|-------------|
| M10-T03 Diseño de sonido | **Timbre y envolvente**: formas de onda, ADSR, filtros y efectos como conceptos, sin código. | `timbre-concept` | `timbre` |
| M10-T04 Performance | **Tensión y liberación**: build-up, clímax, corte, pedal, resolución y respiro. | `tension-device` | `tension-release` |

`sound-design` y `performance-signal` se conservan como `practice` de las unidades S02 y S12. Salen de las pruebas y del examen de M10.

## Curso Strudel

### Modelo de contenido

```
src/content/
  stages/s01.json … s12.json
  strudel-lessons/s01-u01.mdx …
```

```jsonc
{
  "id": "S04",
  "order": 4,
  "title": "Escalas y tonalidades",
  "summary": "De notas sueltas a grados: n, scale y transformaciones de patrones.",
  "prerequisite": "S03",                 // null solo en S01
  "units": [
    {
      "id": "S04-U01",
      "title": "Grados con n y scale",
      "goal": "Tocar cualquier escala mayor por grados.",
      "lesson": "s04-u01",
      "requires": ["M02-T01"],           // temas de teoría; [] si no pide ninguno
      "katas": [ /* Kata, sin cambios de forma */ ],
      "practice": { "mix": [ /* mínimo 1 entrada */ ] }  // opcional, sin nota
    }
  ],
  "boss": { /* Boss, sin cambios de forma */ }
}
```

Esquema (`features/curriculum/schema.ts`):

```ts
const stageId = z.string().regex(/^S\d{2}$/)
const unitId = z.string().regex(/^S\d{2}-U\d{2}$/)
const kataId = z.string().regex(/^(M\d{2}-T\d{2}|S\d{2}-U\d{2})-K\d$/)
const bossId = z.string().regex(/^(M\d{2}|S\d{2})-BOSS$/)
```

- Las katas nuevas usan `S01-U02-K1`. Las existentes conservan su id, aunque cambien de sitio.
- Una etapa tiene exactamente un combate.
- `units` tiene mínimo 1 y sin máximo. `katas` tiene mínimo 1.

### Reglas

- **S1. Etapa desbloqueada** = `prerequisite` aprobado, **o** la etapa ya tiene alguna kata aprobada.
- **S2. Unidad abierta** = etapa desbloqueada y todos sus `requires` aprobados (`isTopicPassed`, que incluye el examen), **o** la unidad ya tiene alguna kata aprobada.
- **S3. Unidad aprobada** = todas sus katas aprobadas. El orden dentro de la etapa es libre, y la UI sugiere el siguiente.
- **S4. Combate desbloqueado** = todas las unidades de la etapa aprobadas.
- **S5. Etapa aprobada** = todas las unidades y el combate aprobados.
- **S6.** Las reglas de kata con ayuda (spec 05, regla 10) y las de aprobar un combate (spec 02) no cambian.

Los "o" de S1 y S2 garantizan que el progreso existente no quede detrás de un candado. Por ejemplo, las katas nuevas de S01 no bloquean a quien ya aprobó katas de M03.

Una unidad cerrada por teoría tiene estado propio y **no** es un candado mudo: dice qué temas faltan y enlaza a cada uno. Si el tema está en un módulo todavía bloqueado, su lección se puede leer pero su prueba no, así que el botón principal va al siguiente paso de teoría (`recommendedNext`).

Consecuencia: S01 y S02 son libres. De S04 en adelante, una unidad exige el cinturón del módulo anterior al de sus temas: S04 pide temas de M02, y M02 se abre con el cinturón de M01. Desde ahí Strudel no puede ir por delante de la teoría, aunque la teoría sí puede ir por delante de Strudel.

```ts
type StageStatus = 'locked' | 'available' | 'boss_ready' | 'passed'
type UnitStatus = 'locked' | 'needs_theory' | 'not_started' | 'in_progress' | 'passed'
```

Funciones nuevas en `rules.ts` (puras y con tests): `isStageUnlocked`, `isStagePassed`, `stageStatus`, `unitStatus`, `missingTheory`, `isUnitPassed`, `stageBossUnlocked`, `recommendedStrudel`, `newlyPassedModule`.

`recommendedStrudel` recorre las etapas en orden y, en la primera desbloqueada y no aprobada, devuelve la primera unidad abierta sin aprobar. Si no hay, devuelve el combate cuando esté abierto. Si todo lo pendiente está en `needs_theory`, devuelve esa unidad con los temas que faltan. Con todo aprobado devuelve `null`.

Se eliminan `bossUnlocked` y la rama `boss` de `recommendedNext`, que pasa a sugerir tema o examen.

### XP y rango

- Sin cambios de valores: 30 por kata sin ayuda, 100 por tema, 300 por combate.
- El XP de combate se deriva directamente de `progress.bosses`, sin recorrer el currículo: cualquier id con un registro aprobado suma 300.
- `beltFor` sigue siendo solo de teoría. El header muestra el cinturón. El avance de Strudel se ve en `/strudel` y en el inicio, como "Etapa N de 12".

### Rutas

| Ruta | Isla | Contenido |
|------|------|-----------|
| `/strudel` | `StrudelHome` | Las 12 etapas con su estado y "Continuar". |
| `/strudel/[stage]` | `StageView` | Unidades con estado, teoría que falta y combate. |
| `/strudel/[stage]/[unit]` | lección MDX + `UnitPanel` | Lección arriba; abajo, katas y práctica opcional. |
| `/strudel/[stage]/combate` | `BossView` | Igual que hoy. |
| `/strudel/kata/[kata]` | `KataView` | El segmento es el id en minúsculas (`m02-t01-k1`), así que no depende de la posición de la kata. |
| `/m/[module]/examen` | `TestView` | Reemplaza a `/m/[module]/ubicacion`. |

Se eliminan `/m/[module]/combate`, `/m/[module]/[topic]/kata/[kata]` y `/m/[module]/ubicacion`.

### Inicio y navegación

- El inicio muestra dos tarjetas "Continuar", Teoría y Strudel, una al lado de la otra en escritorio y apiladas en 390 px.
- Si lo siguiente en Strudel está cerrado por teoría, la tarjeta lo dice y enlaza al tema que falta.
- Si un curso está terminado (`null`), su tarjeta dice que está completo y deja de pedir acción.
- Los accesos directos suman "Strudel".

### Sensei

- `findKata` y `findBoss` buscan en las etapas. Una kata se encuentra por id, sin deducir el módulo desde el prefijo.
- `sensei/contracts.ts` acepta los ids nuevos. Hoy su regex solo admite `Mnn-Tnn-Kn` y `Mnn-BOSS`, así que rechazaría las pistas de `S01-U02-K1` y la revisión de `S01-BOSS`.
- `/api/sensei/review` arma la lista de habilidades con los `skills` de los temas en `requires` de la etapa. Si está vacía (S01 y S02), usa los títulos de las unidades. El prompt dice `Stage:` con el título de la etapa, en lugar de `Belt:` con el del módulo.
- El contrato de la API y el `bossId` no cambian.

### Validación (`curriculum.test.ts`)

Se mantienen, sobre etapas: ids únicos, cada `solution` pasa sus aserciones, ningún `starter` aprueba ya y cada combate tiene pieza de referencia.

Se agregan:

- Cada `requires` existe.
- Las mezclas de `practice` de las unidades pasan el validador del registro.
- Ninguna lección de unidad sigue con texto provisional.
- Ningún tema de teoría tiene `katas` ni `boss` (el esquema ya lo impide).
- Las etapas siguen la cadena `order` y `prerequisite`.
- Cada función que una kata usa aparece antes en la lección de esa unidad o de una anterior en orden de etapas. Es la regla actual, recorriendo etapas en lugar de módulos.
- Las lecciones de teoría no contienen `<Example>`, `<StrudelRef>` ni `## Strudel`.
- Las 120 katas y los 10 combates existentes siguen presentes, con el mismo id. La lista se fija en el test para detectar pérdidas.

## Etapas y clasificación

**Decisión de diseño.** La propuesta inicial eran 7 etapas. Son 12 porque cada módulo tiene su combate y un combate por etapa simplifica el modelo. Revisando las funciones de cada kata, además, la mayoría usa teoría de su propio módulo: `M08-T03-K1` es solo `note`, pero exige saber qué es una sustitución tritonal. Por eso, de S03 en adelante el orden sigue al de los módulos, y el orden propio de Strudel se nota sobre todo en S01, S02 y S12.

Acciones: **Mover** = sin cambios de contenido. **Adaptar** = conserva id y objetivo, cambian `brief`, `starter` o `solution`. **Nueva** = id nuevo.

Resumen: 117 katas se mueven sin cambios, 3 se adaptan y 11 son nuevas, para un total de 131. 10 combates se mueven y 2 son nuevos.

Las 3 adaptadas son M10-T03-K2 y M10-T03-K3, que no pueden usar `chord` ni `scale` porque S02 va antes, y M01-T04-K2, que habla de corcheas y S01 no pide teoría.

### S01 · Ritmo

Sin requisitos de teoría.

| Unidad | Requiere | Lección desde | Katas |
|--------|----------|---------------|-------|
| S01-U01 Primeros sonidos | — | m01-t01 `## Strudel` | Mover M01-T01-K1, M01-T01-K2 |
| S01-U02 Mini-notation | — | m01-t03 `## Strudel`, reescrita con batería | Nuevas S01-U02-K1, K2, K3 (`~`, `*`, `[ ]`, `< >`, `,`) |
| S01-U03 Ciclos y euclidianos | — | m01-t04 `## Strudel` | Mover M01-T04-K1 · Adaptar M01-T04-K2 (sin "corcheas") · Nueva S01-U03-K1 (`!`) |
| S01-U04 Capas de batería | — | m01-t04 (bloque `stack`) | Nuevas S01-U04-K1, K2 |

Combate **S01-BOSS** (nuevo): beat de 4 compases solo con batería, con variación entre compases. `usesFunction: stack`, `soundsInclude: bd, sd, hh`, `sectionsDistinct: 2`.

### S02 · Sonido

Sin requisitos de teoría. `note` se presenta aquí como "letras y un número de octava", sin explicar teoría. Tres ejemplos de m10-t03 usan `chord` y `scale`: al pasar a S02 se reescriben con `note`.

| Unidad | Requiere | Lección desde | Katas |
|--------|----------|---------------|-------|
| S02-U01 Sintes y samples | — | m10-t03 "Sintes y samples" + nota breve de `note` | Nuevas S02-U01-K1, K2 |
| S02-U02 Envolvente | — | m10-t03 "La envolvente: ADSR" | Adaptar M10-T03-K2 (`note` en vez de `chord`) · Nueva S02-U02-K1 |
| S02-U03 Filtros | — | m10-t03 "Filtros", m06-t04 (`lpf`) | Mover M10-T03-K1 · Nueva S02-U03-K1 |
| S02-U04 Efectos y mezcla | — | m10-t03 "Efectos", m06-t02 (`gain`), m06-t04 (`room`, `sustain`), m10-t02 (`pan`, `orbit`) | Adaptar M10-T03-K3 (`note` en vez de `n`/`scale`) · Nueva S02-U04-K1 |

`practice` en S02-U04: `sound-design`.

Combate **S02-BOSS** (nuevo): un bajo y un pad con sonidos distintos, con un filtro (`lpf`) y reverberación (`room`). `usesFunction` exige todas las funciones que lista, así que el brief pide las dos. `usesFunction: lpf, room`, `layerCount: 2`.

### S03 · Notas e intervalos

| Unidad | Requiere | Lección desde | Katas |
|--------|----------|---------------|-------|
| S03-U01 `note` y octavas | M01-T01, M01-T02 | m01-t02 `## Strudel` | Mover M01-T01-K3, M01-T02-K1, M01-T02-K2, M01-T02-K3 |
| S03-U02 Intervalos en código | M01-T03, M01-T04 | m01-t03 `## Strudel` (parte de intervalos) | Mover M01-T03-K1, M01-T03-K2, M01-T03-K3, M01-T04-K3 |

Combate: M01-BOSS.

### S04 · Escalas y tonalidades

| Unidad | Requiere | Lección desde | Katas |
|--------|----------|---------------|-------|
| S04-U01 Grados con `n` y `scale` | M02-T01 | m02-t01 | Mover M02-T01-K1, M02-T01-K2, M02-T01-K3 |
| S04-U02 Una tonalidad por ciclo | M02-T02 | m02-t02 | Mover M02-T02-K1, M02-T02-K2, M02-T02-K3 |
| S04-U03 Transformar patrones | M02-T03 | m02-t03 | Mover M02-T03-K1, M02-T03-K2, M02-T03-K3 |
| S04-U04 Mayor y menor | M02-T04 | m02-t04 | Mover M02-T04-K1, M02-T04-K2, M02-T04-K3 |

Combate: M02-BOSS.

### S05 · Acordes

| Unidad | Requiere | Lección desde | Katas |
|--------|----------|---------------|-------|
| S05-U01 `note` y `chord` | M03-T01 | m03-t01 | Mover M03-T01-K1, M03-T01-K2, M03-T01-K3 |
| S05-U02 `voicing` y `anchor` | M03-T02 | m03-t02 | Mover M03-T02-K1, M03-T02-K2, M03-T02-K3 |
| S05-U03 Apilar terceras | M03-T03 | m03-t03 | Mover M03-T03-K1, M03-T03-K2, M03-T03-K3 |
| S05-U04 Arpegios y acompañamiento | M03-T04 | m03-t04 | Mover M03-T04-K1, M03-T04-K2, M03-T04-K3 |

Combate: M03-BOSS.

### S06 · Capas y progresiones

| Unidad | Requiere | Lección desde | Katas |
|--------|----------|---------------|-------|
| S06-U01 Una banda en capas | M04-T01 | m04-t01 | Mover M04-T01-K1, M04-T01-K2, M04-T01-K3 |
| S06-U02 Frases de dos ciclos | M04-T02 | m04-t02 | Mover M04-T02-K1, M04-T02-K2, M04-T02-K3 |
| S06-U03 Ordenar secciones | M04-T03 | m04-t03 | Mover M04-T03-K1, M04-T03-K2, M04-T03-K3 |
| S06-U04 Comping | M04-T04 | m04-t04 | Mover M04-T04-K1, M04-T04-K2, M04-T04-K3 |

Combate: M04-BOSS.

### S07 · Transporte y modulación

| Unidad | Requiere | Lección desde | Katas |
|--------|----------|---------------|-------|
| S07-U01 `transpose` | M05-T01 | m05-t01 | Mover M05-T01-K1, M05-T01-K2, M05-T01-K3 |
| S07-U02 Mismos grados, otra escala | M05-T02 | m05-t02 | Mover M05-T02-K1, M05-T02-K2, M05-T02-K3 |
| S07-U03 Secciones en dos tonalidades | M05-T03 | m05-t03 | Mover M05-T03-K1, M05-T03-K2, M05-T03-K3 |
| S07-U04 Ciclos con `add` | M05-T04 | m05-t04 | Mover M05-T04-K1, M05-T04-K2, M05-T04-K3 |

Combate: M05-BOSS.

### S08 · Modos

| Unidad | Requiere | Lección desde | Katas |
|--------|----------|---------------|-------|
| S08-U01 El modo dentro de `scale` | M06-T01 | m06-t01 | Mover M06-T01-K1, M06-T01-K2, M06-T01-K3 |
| S08-U02 Acentuar la nota característica | M06-T02 | m06-t02 | Mover M06-T02-K1, M06-T02-K2, M06-T02-K3 |
| S08-U03 Un modo por ciclo | M06-T03 | m06-t03 | Mover M06-T03-K1, M06-T03-K2, M06-T03-K3 |
| S08-U04 Vamps y drones | M06-T04 | m06-t04 (sin encabezado: extraer a mano) | Mover M06-T04-K1, M06-T04-K2, M06-T04-K3 |

Combate: M06-BOSS.

### S09 · Séptimas y voces

| Unidad | Requiere | Lección desde | Katas |
|--------|----------|---------------|-------|
| S09-U01 Séptimas con `chord` | M07-T01 | m07-t01 | Mover M07-T01-K1, M07-T01-K2, M07-T01-K3 |
| S09-U02 Progresiones y `mode` | M07-T02 | m07-t02 | Mover M07-T02-K1, M07-T02-K2, M07-T02-K3 |
| S09-U03 Tensiones y diccionarios | M07-T03 | m07-t03 | Mover M07-T03-K1, M07-T03-K2, M07-T03-K3 |
| S09-U04 Dos voces independientes | M07-T04 | m07-t04 | Mover M07-T04-K1, M07-T04-K2, M07-T04-K3 |

Combate: M07-BOSS.

### S10 · Armonía avanzada

| Unidad | Requiere | Lección desde | Katas |
|--------|----------|---------------|-------|
| S10-U01 Dominantes secundarias | M08-T01 | m08-t01 (sin encabezado: extraer a mano) | Mover M08-T01-K1, M08-T01-K2, M08-T01-K3 |
| S10-U02 Comparar versiones | M08-T02 | m08-t02 | Mover M08-T02-K1, M08-T02-K2, M08-T02-K3 |
| S10-U03 Sustitución tritonal | M08-T03 | m08-t03 (sin encabezado: extraer a mano) | Mover M08-T03-K1, M08-T03-K2, M08-T03-K3 |
| S10-U04 Bajo cromático | M08-T04 | m08-t04 | Mover M08-T04-K1, M08-T04-K2, M08-T04-K3 |

Combate: M08-BOSS.

### S11 · Escalas y azar

| Unidad | Requiere | Lección desde | Katas |
|--------|----------|---------------|-------|
| S11-U01 Menores y sus modos | M09-T01 | m09-t01 (sin encabezado: extraer a mano) | Mover M09-T01-K1, M09-T01-K2, M09-T01-K3 |
| S11-U02 Solos al azar | M09-T02 | m09-t02 | Mover M09-T02-K1, M09-T02-K2, M09-T02-K3 |
| S11-U03 Patrones simétricos | M09-T03 | m09-t03 | Mover M09-T03-K1, M09-T03-K2, M09-T03-K3 |
| S11-U04 Un improvisador que sigue los acordes | M09-T04 | m09-t04 | Mover M09-T04-K1, M09-T04-K2, M09-T04-K3 |

Combate: M09-BOSS.

### S12 · Live coding

| Unidad | Requiere | Lección desde | Katas |
|--------|----------|---------------|-------|
| S12-U01 Forma y variaciones | M10-T01 | m10-t01 | Mover M10-T01-K1, M10-T01-K2, M10-T01-K3 |
| S12-U02 La mezcla | M10-T02 | m10-t02 | Mover M10-T02-K1, M10-T02-K2, M10-T02-K3 |
| S12-U03 Señales y azar | M10-T04 | m10-t04 "Señales", "Azar con intención" | Mover M10-T04-K1, M10-T04-K2, M10-T04-K3 |

`practice` en S12-U03: `performance-signal`.

Combate: M10-BOSS. Es el cierre del curso.

## Texto de teoría que hay que limpiar

Además de las secciones `## Strudel`, estas lecciones tienen referencias sueltas que se mueven o se quitan en P15:

| Lección | Qué tiene |
|---------|-----------|
| m01-t04 | "En Strudel, un ciclo es un compás", el desplegable del 6/8 y el bloque de `stack` con `<Example>` |
| m02-t03 | "`n` cuenta desde 0" |
| m04-t03 | "`!` repite un elemento" |
| m06-t04 | Dron con `sustain`, `lpf`, `room` y `<Example>` |
| m08-t01, m08-t03, m09-t01 | `<Example>` dentro de secciones de teoría |
| m08-t04 | "el °7 se escribe `o7`" |
| m09-t01 | Aviso "Nombres con espacio en Strudel" |
| m09-t04 | Aviso "Cifrado en Strudel" y `<Example>` |
| m10-t01, m10-t02 | Resumen inicial con funciones |
| m10-t03, m10-t04 | Reescritura completa |

Lo que tiene valor para programar pasa a la lección de su unidad. Al mover hay que reescribir las referencias al curso de origen: m08-t01 dice "como en el cinturón naranja" y la rúbrica de M01-BOSS dice "los intervalos del módulo". La mención de m01-t01 al sistema americano se queda, porque explica la notación en general.

## Despliegue

- P13 se puede publicar sola.
- P14 y P15 se publican juntas. Entre las dos, S01 y S02 están incompletas y las lecciones siguen mezcladas.
- Hasta P16, M10 todavía pregunta por funciones de Strudel en sus pruebas y en su examen.

## Decisiones tomadas

Se pueden cambiar antes de empezar cada fase.

| Decisión | Elegida | Alternativa descartada |
|----------|---------|------------------------|
| Requisito de teoría en Strudel | Cierra la unidad, con enlace al tema | Solo un aviso: permitiría katas imposibles sin la teoría |
| Umbral del examen | 80 % tras los temas, 90 % para saltar | Un solo umbral: el 90 % es duro después de hacer todo |
| Cierre de cada cinturón | Examen | Mantener el combate: volvería a atar la teoría al código |
| Combate aprobado | Sigue contando para el cinturón si los temas están aprobados, también en adelante | Solo examen: haría retroceder cinturones ya ganados |
| Curso de Strudel | Lineal por etapas | Libre: rompería el orden de funciones |
| Dan | Por examen, o por los temas y la pieza final (regla T3) | Exigir la pieza: volvería a mezclar los cursos |
