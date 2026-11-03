# 02 · Modelo de contenido

Todo el contenido vive en el repo y se valida en build con colecciones de contenido de Astro (`src/content.config.ts`, esquemas `astro/zod`). Con un esquema inválido el build falla: ningún módulo roto llega a producción. Los nombres de campo van en inglés (el formato es nuestro); los textos visibles van en español.

## Archivos

```
src/content/
  modules/m01.json … m10.json     # metadata, temas, generadores, katas, combate
  lessons/m01-t01.mdx …           # una lección por tema, con componentes interactivos
```

Un módulo sin `lessons` completas puede existir con `status: "draft"`: se muestra como "Próximamente" y no bloquea a nadie, porque el que le sigue tampoco existe todavía.

## Módulo (`modules/mNN.json`)

```jsonc
{
  "id": "M01",
  "order": 1,
  "belt": "white",                       // white|yellow|orange|green|blue|purple|brown|red|black|dan
  "title": "Reactivar fundamentos",
  "summary": "Notas, intervalos y ritmo, más tus primeros sonidos en Strudel.",
  "status": "ready",                     // ready | draft
  "prerequisite": null,                  // id del módulo anterior, o null
  "placement": {                         // prueba de ubicación opcional
    "questions": 20,
    "passPercent": 90,
    "mix": [{ "generator": "note-name", "weight": 1 }, { "generator": "interval-name", "weight": 2 }]
  },
  "topics": [ /* Topic */ ],
  "boss": { /* Boss */ }
}
```

## Tema (`Topic`)

```jsonc
{
  "id": "M01-T03",
  "title": "Intervalos",
  "goal": "Nombrar cualquier intervalo hasta la octava por número y calidad, en papel, teclado, diapasón y de oído.",
  "lesson": "m01-t03",                   // slug en lessons/
  "skills": ["interval-quality", "interval-ear"],
  "practice": {                          // ilimitada, sin nota
    "mix": [
      { "generator": "interval-name", "params": { "maxInterval": "8P", "qualities": ["m","M","P"] }, "weight": 3 },
      { "generator": "ear-interval", "params": { "set": ["2M","3M","4P","5P","8P"], "direction": "up" }, "weight": 2 }
    ]
  },
  "test": {                              // calificada
    "questions": 10,
    "passPercent": 80,
    "mix": [ /* igual que practice; puede ser más difícil */ ]
  },
  "katas": [ /* Kata */ ]
}
```

## Kata

```jsonc
{
  "id": "M01-T03-K1",
  "title": "Quintas en paralelo",
  "brief": "Toca la melodía C D E F G y súmale una quinta justa arriba a cada nota, como un power chord.",
  "starter": "note(\"c3 d3 e3 f3 g3\")\n  .s(\"piano\")",
  "solution": "note(\"[c3,g3] [d3,a3] [e3,b3] [f3,c4] [g3,d4]\").s(\"piano\")",
  "cycles": 1,                           // cuántos ciclos se consultan para validar
  "assertions": [                        // ver 04-strudel-engine.md
    { "type": "usesFunction", "names": ["note"] },
    { "type": "harmonicIntervals", "interval": "5P", "minRatio": 1 },
    { "type": "noteSequence", "voice": "lowest", "pitchClasses": ["C","D","E","F","G"] }
  ],
  "hints": ["La coma dentro de [ ] hace que dos notas suenen juntas."]
}
```

`solution` es obligatoria: un test pasa cada `solution` por sus aserciones, así ninguna kata queda imposible de resolver.

## Combate (`Boss`)

```jsonc
{
  "id": "M01-BOSS",
  "title": "Primer beat",
  "brief": "4 compases: bombo, caja, hi-hat y una línea de 8 notas con al menos 3 intervalos distintos.",
  "starter": "stack(\n  s(\"bd ~ sd ~\"),\n  note(\"c3 e3 g3 c4\").s(\"piano\")\n)",
  "cycles": 4,
  "assertions": [ { "type": "soundsInclude", "names": ["bd","sd","hh"] }, { "type": "distinctMelodicIntervals", "min": 3 } ],
  "rubric": [
    { "id": "rhythm", "label": "El ritmo es coherente y tiene variación", "weight": 3 },
    { "id": "theory", "label": "Usa los intervalos del módulo con intención", "weight": 3 },
    { "id": "code", "label": "Código claro, mini-notation variada", "weight": 2 },
    { "id": "music", "label": "Suena musical, tiene inicio y cierre", "weight": 2 }
  ],
  "passScore": 7                         // de 10, ponderado
}
```

Para aprobar un combate, las aserciones deben pasar **y** el puntaje de la rúbrica debe ser `>= passScore`. El puntaje lo pone el Sensei, o el propio perfil marcando la rúbrica si no hay clave de API (queda guardado como `selfAssessed: true` y se muestra con una insignia distinta).

## Lección (`lessons/*.mdx`)

Frontmatter mínimo: `topic: M01-T03`, `title`. El cuerpo es MDX y puede usar estos componentes (islas Preact, `client:visible`):

| Componente | Uso |
|------------|-----|
| `<Listen code="note('c4 g4')" />` | Botón que reproduce un fragmento Strudel (sin editor). |
| `<Example code="…" />` | Mini-editor Strudel editable con su visual (pianoroll). |
| `<Keyboard highlight={["C","E","G"]} labels="degrees" />` | Teclado de solo lectura con notas marcadas. |
| `<Fretboard highlight={["C","E","G"]} frets={[0,12]} />` | Diapasón de solo lectura. |
| `<Staff abc="C D E F|G4" />` | Pentagrama (ABC notation, abcjs). |
| `<Callout kind="tip|warning|theory">` | Recuadro destacado. |
| `<StrudelRef fn="scale" />` | Ficha de la función, desde `@strudel/reference`. |

Reglas para escribir lecciones:
- Que sean cortas: lo que se lee en 5–8 minutos. La práctica enseña el resto.
- Cada concepto nuevo trae un `<Listen>` o un `<Example>`: si no suena, no está terminado.
- La terminología va en español con el equivalente en inglés la primera vez ("quinta justa (perfect fifth, 5P)"), porque Strudel y `tonal` usan los nombres en inglés.

## Validación extra (test, no esquema)

`src/features/curriculum/curriculum.test.ts` revisa, además del esquema:
- ids únicos y con el prefijo correcto en todo el currículo;
- que cada `generator` exista en el registro y que sus `params` pasen el validador de ese generador;
- que cada `lesson` exista;
- que cada `solution` de kata y combate pase sus aserciones (este test corre en Node con `@strudel/core` + `mini` + `tonal`, sin audio);
- que la cadena de `prerequisite` siga el orden `order`.
