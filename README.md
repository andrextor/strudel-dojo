# Strudel Dojo

Aprende teoría musical de verdad (intervalos, escalas, armonía, transporte, modos y composición) y live coding con [Strudel](https://strudel.cc), cinturón por cinturón.

- 10 cinturones, del blanco al Dan, con 4 temas cada uno.
- Práctica infinita generada y siempre correcta (la calcula [`tonal`](https://github.com/tonaljs/tonal)).
- Katas de Strudel que se validan analizando lo que suena tu patrón.
- Respuestas con teclado, diapasón, texto o teclado MIDI.
- Entrenamiento auditivo y repaso espaciado.
- Combates creativos revisados por el Sensei (Claude).
- Perfiles para entrenar en familia.

## Estado

En diseño. Los specs están en [`docs/specs/`](docs/specs) y el plan de construcción por fases en [`docs/plans/`](docs/plans).

## Desarrollo

```bash
pnpm install
cp .env.example .env   # opcional: ANTHROPIC_API_KEY activa al Sensei
pnpm dev
```

## Licencia

[AGPL-3.0](LICENSE), igual que Strudel.
