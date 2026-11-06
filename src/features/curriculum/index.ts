// Typed access to the content collections. For use in .astro pages and build
// only — islands receive serializable slices as props, never the collection.
import { getCollection } from 'astro:content'
import type { Kata, Module, Stage } from './schema.ts'

type TopicOf<M> = M extends { topics: infer T }
  ? T extends readonly (infer U)[]
    ? U
    : never
  : never
export type Topic = TopicOf<Module>

export async function getCurriculum(): Promise<Module[]> {
  const entries = await getCollection('modules')
  return entries.map((e) => e.data).sort((a, b) => a.order - b.order)
}

export async function getStages(): Promise<Stage[]> {
  const entries = await getCollection('stages')
  return entries.map((e) => e.data).sort((a, b) => a.order - b.order)
}

export async function findTopic(id: string): Promise<{ module: Module; topic: Topic } | null> {
  const curriculum = await getCurriculum()
  for (const module of curriculum) {
    for (const topic of module.topics) {
      if (topic.id === id) return { module, topic }
    }
  }
  return null
}

export async function findKata(id: string): Promise<Kata | null> {
  const stages = await getStages()
  return stages.flatMap((s) => s.units.flatMap((u) => u.katas)).find((k) => k.id === id) ?? null
}

export async function findBossStage(bossId: string): Promise<Stage | null> {
  return (await getStages()).find((s) => s.boss.id === bossId) ?? null
}

// The next topic in curriculum order, across module boundaries, or null at the end.
export async function nextTopic(id: string): Promise<Topic | null> {
  const curriculum = await getCurriculum()
  const flat = curriculum.flatMap((m) => m.topics)
  const index = flat.findIndex((t) => t.id === id)
  if (index === -1 || index + 1 >= flat.length) return null
  return flat[index + 1] ?? null
}
