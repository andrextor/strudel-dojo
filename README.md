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

Cinturones blanco (M01) y amarillo (M02) completos; M03–M10 aparecen como "Próximamente" y se agregan siguiendo [`docs/plans/P11-content-recipe.md`](docs/plans/P11-content-recipe.md). Los specs están en [`docs/specs/`](docs/specs) y el plan por fases en [`docs/plans/`](docs/plans).

## Desarrollo

Necesitas Node 24 (`.nvmrc`) y pnpm.

```bash
pnpm install
cp .env.example .env   # opcional: ANTHROPIC_API_KEY activa al Sensei
pnpm dev               # http://localhost:4321
pnpm ci:check          # lint + typecheck + tests + contraste + build
```

Sin `ANTHROPIC_API_KEY` todo funciona igual: no aparecen los botones del Sensei y los combates se autoevalúan con la rúbrica.

## Desplegar en Vercel

1. Importa el repositorio en Vercel. El preset de Astro y el adaptador `@astrojs/vercel` ya están configurados; no hace falta tocar el comando de build ni la carpeta de salida.
2. Usa Node 24 en *Settings → General → Node.js Version*.
3. Para activar al Sensei, agrega `ANTHROPIC_API_KEY` en *Settings → Environment Variables* (entorno Production y, si quieres, Preview) y vuelve a desplegar. La clave solo se lee en el servidor (`astro:env`, `access: 'secret'`) y nunca llega al navegador.
4. Las rutas `/api/sensei/*` corren como función de servidor; el resto del sitio es estático. El límite de pedidos por hora vive en la memoria de cada instancia (ver la nota `ponytail:` en `src/lib/rate-limit.ts`).

El progreso de cada perfil vive en el `localStorage` del navegador: no hay base de datos ni cuentas. Para pasarlo a otro dispositivo se usa el respaldo (archivo o código) en `/progreso`.

## Licencia

[AGPL-3.0](LICENSE), igual que Strudel.
