import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { lessonSchema, moduleSchema } from './features/curriculum/schema.ts'

const modules = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/modules' }),
  schema: moduleSchema,
})

const lessons = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/lessons' }),
  schema: lessonSchema,
})

export const collections = { modules, lessons }
