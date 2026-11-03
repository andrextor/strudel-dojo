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
  },
})
