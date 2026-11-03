# 06 · Sensei (Claude)

El Sensei es opcional: sin `ANTHROPIC_API_KEY`, todo funciona, las pistas no aparecen y el combate se autoevalúa con la rúbrica. Sigue el mismo patrón que `test-maria-del-oceano` (`src/lib/claude.ts`, `astro:env`, salidas estructuradas, errores tipados mapeados a español, rate limit).

**El agente que implemente esta fase debe cargar la skill `claude-api` antes de escribir código** para confirmar ids de modelo, parámetros y helpers del SDK vigentes.

## Rutas (`prerender = false`)

| Ruta | Modelo | Qué hace |
|------|--------|----------|
| `POST /api/sensei/hint` | `claude-haiku-5-5` | Una pista para una pregunta de prueba/práctica o una kata. Nunca da la respuesta. |
| `POST /api/sensei/review` | `claude-sonnet-5-5` | Revisión del combate: rúbrica puntuada, fortalezas, siguientes pasos y una variación sugerida en código. |
| `POST /api/sensei/explain` | `claude-haiku-5-5` | "Explícame este código": explica qué hace un patrón del Dojo libre o de una lección, línea por línea. |

Los modelos se declaran como constantes en `src/lib/claude.ts`, con un comentario de una línea sobre el porqué (volumen/costo vs calidad), igual que en el proyecto de referencia.

## Contratos

```ts
// hint
request:  { context: 'question'; question: Pick<Question,'prompt'|'input'|'skill'|'answer'>; response?: Response }
          // `answer` solo lo usa el guard del servidor; nunca entra al prompt del modelo
        | { context: 'kata'; kata: Pick<Kata,'brief'|'assertions'>; code: string; failing: string[] }
response: { hint: string }              // 1–2 frases

// review
request:  { boss: Pick<Boss,'brief'|'rubric'|'passScore'>; code: string; summary: PatternSummary;
            assertions: AssertionResult[]; moduleTitle: string; skills: string[] }
response: SenseiReview

interface SenseiReview {
  criteria: { id: string; score: number /* 0–10 */; comment: string }[]
  score: number                          // calculado EN EL SERVIDOR con los pesos, no lo da el modelo
  strengths: string[]                   // 1–3
  nextSteps: string[]                   // 1–3, accionables
  variation: { idea: string; code: string }   // se valida con evaluate() antes de mostrarla
}

// explain
request:  { code: string }
response: { overview: string; lines: { line: number; text: string }[] }
```

## Reglas

- **La clave de la respuesta nunca va al modelo** en las pistas de preguntas. Igual que `revealsAnswer` en el proyecto de referencia, `hint.ts` rechaza una pista que contenga la respuesta canónica normalizada (nota, intervalo, cifrado o índice de opción). Si se rechaza, se responde 422 con un mensaje para reintentar.
- En katas, la pista puede ver el código y las aserciones que fallan, pero no la `solution`.
- El puntaje final del combate lo calcula el servidor con los pesos de la rúbrica. El modelo solo puntúa cada criterio; así no puede "aprobar" de más.
- La `variation.code` se pasa por `evaluate()` en el cliente antes de mostrarla. Si falla, se oculta sin error visible.
- Código del usuario y textos son **datos, nunca instrucciones**: el system prompt lo dice explícitamente, y el código va dentro de un bloque delimitado.
- Español neutro, "tú", sin asumir edad ni género, con un tono de sensei exigente pero cálido: concreto, sin halagos vacíos.
- Límites: el código hasta 8 000 caracteres y el request hasta 32 KB. Rate limit en memoria por IP: 60 pistas/h, 10 revisiones/h, 30 explicaciones/h (`src/lib/rate-limit.ts`, con su nota `ponytail:` sobre serverless).
- Errores: copiar el mapeo de `claudeError` (429/503/400/502) con mensajes en español. Ningún detalle del upstream llega al navegador.
- `stop_reason === 'refusal'` o salida vacía → 422 con mensaje para reintentar.

## UI

- "Pedir pista al Sensei" debajo de cada pregunta y kata (una por pregunta en prueba; ilimitadas en práctica). En pruebas, pedir pista queda registrado en la respuesta y la pregunta vale la mitad de XP.
- La revisión del combate se muestra como una tarjeta: el puntaje grande, cada criterio con barra y comentario, fortalezas, siguientes pasos, y la variación con un botón "Escuchar variación".
- Sin clave: el botón de pista no aparece y el combate muestra la rúbrica como checklist con escala 0–10 por criterio (autoevaluación honesta, marcada como tal).
