# 00 · Producto

## Visión

**Strudel Dojo** es una app web para aprender teoría musical completa y live coding con [Strudel](https://strudel.cc) al mismo tiempo, módulo por módulo, desde fundamentos hasta composición. Cada concepto de teoría se practica de dos formas: con ejercicios autocalificados (teclado, diapasón, pentagrama, oído) y con katas de código Strudel que se validan escuchando y analizando el patrón que escribes.

La metáfora es un **dojo**: cada módulo es un cinturón, cada tema termina en una prueba y en katas, y cada cinturón se gana en un combate final, una pieza creativa que revisa el **Sensei** (Claude).

## Usuarios

| Perfil | Contexto |
|--------|----------|
| Iván (dueño) | Toca guitarra y piano, lee partitura y figuras rítmicas, conoce la escala mayor de forma básica. Empezó el tutorial de Strudel y no lo terminó. Quiere llegar a nivel "master" técnico. |
| Su hijo | Comparte la app. Edad y nivel no confirmados: el contenido no asume edad, el tono es **chévere, no infantil**. |

Implicaciones:
- **Perfiles locales** en el mismo dispositivo (sin contraseñas), cada uno con su progreso, y respaldo exportable para pasar de un dispositivo a otro.
- **Prueba de ubicación** por módulo para que quien ya sabe no repita lo básico.
- Guitarra **y** piano son de primera clase: el teclado y el diapasón son entrada de respuestas y visualización.
- Teclado MIDI físico opcional como entrada (Web MIDI).

## Tono y estética

Dojo nocturno con neón: fondo tinta, acentos naranja torii y cian neón, cinturones de colores, tipografía display con carácter. Vibra de "sala de práctica a medianoche / live coding en club", no de app para niños. Sin mascotas, sin lenguaje infantil, sin exceso de emojis. Ver `DESIGN.md`.

Copy en español neutro latinoamericano con "tú", en oraciones simples, sin asumir género.

## Alcance (v1)

1. Currículo de 10 cinturones (ver `01-curriculum.md`), con contenido completo de los cinturones 1 y 2 en v1 y el resto añadido por fases.
2. Por tema: lección (MDX con ejemplos que suenan), práctica ilimitada generada, prueba calificada, katas Strudel validadas.
3. Por módulo: combate final creativo revisado por el Sensei (o autoevaluado con rúbrica si no hay clave de API).
4. Motor Strudel propio: editor CodeMirror con resaltado de eventos, visuales (pianoroll, scope, punchcard, Hydra opcional), validación automática de katas consultando los eventos del patrón.
5. Entrenamiento auditivo (intervalos, calidades de acorde, modos, dictado melódico corto).
6. Perfiles, progreso en `localStorage`, respaldo JSON.
7. Repaso espaciado de habilidades débiles.
8. Dojo libre: un REPL completo para jugar fuera del currículo.
9. Despliegue en Vercel.

## Fuera de alcance (v1), con el motivo

| No se hace | Por qué / cuándo |
|------------|------------------|
| Cuentas, login, sincronización en la nube | Dos personas, cada uno con su dispositivo; el respaldo JSON cubre el caso. Añadir si aparece una tercera persona o un segundo dispositivo diario. |
| Ranking o competencia entre perfiles | Distrae del aprendizaje; la comparación padre/hijo puede desmotivar. |
| Compartir patrones por URL que se ejecutan solos | Ejecutar código ajeno es un riesgo; si se añade, el código se muestra y solo corre al pulsar "Reproducir". |
| Anti-trampa | Es autoaprendizaje; las claves pueden vivir en el cliente. |
| Grabación/exportación de audio | Strudel ya permite grabar desde su REPL; no es parte de aprender. |
| Modo claro | El editor y el live coding viven en oscuro; un solo tema evita duplicar el trabajo de contraste. |

## Métricas de éxito

- Cada concepto del currículo tiene al menos un ejercicio autocalificado y una kata.
- Los ejercicios de teoría generados son **correctos por construcción** (los calcula `tonal`, con tests), así la práctica nunca se acaba ni se recicla.
- `pnpm ci:check` en verde en cada PR.
- Se usa en el celular (390 px) para teoría y oído, y en laptop para Strudel.
