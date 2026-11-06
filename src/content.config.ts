import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import {
  lessonSchema,
  moduleSchema,
  stageSchema,
  unitLessonSchema,
} from './features/curriculum/schema.ts'

const modules = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/modules' }),
  schema: moduleSchema,
})

const lessons = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/lessons' }),
  schema: lessonSchema,
})

const stages = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/stages' }),
  schema: stageSchema,
})

const strudelLessons = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/strudel-lessons' }),
  schema: unitLessonSchema,
})

export const collections = { modules, lessons, stages, strudelLessons }
