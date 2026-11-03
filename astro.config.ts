import mdx from '@astrojs/mdx'
import preact from '@astrojs/preact'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, envField } from 'astro/config'

export default defineConfig({
  // No long AI generation here; 60 s is plenty for the Sensei routes.
  adapter: vercel({ maxDuration: 60 }),
  integrations: [preact(), mdx()],
  env: {
    schema: {
      ANTHROPIC_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // ponytail: @strudel/codemirror (~960 kB) and @strudel/reference (~550 kB) ship as one
      // prebuilt dist file each, so they cannot be split; both load lazily, never on `/`.
      // Lower this back if a non-Strudel chunk ever gets near it.
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        onLog(level, log, handler) {
          // @strudel/soundfonts parses its preset files with a direct eval; upstream code.
          if (log.code === 'EVAL' && log.id?.includes('@strudel/soundfonts')) return
          handler(level, log)
        },
      },
    },
  },
})
