// Shared fixtures for the progress tests: the real curriculum read from disk, and shortcuts to
// take a test or pass a module. Never imported by app code.
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRng } from '../../lib/random.ts'
import { type MixEntry, type Module, moduleSchema } from '../curriculum/schema.ts'
import type { Question, Response } from '../exercises/types.ts'
import { emptyProgress } from './persist.ts'
import { recordBoss, recordKata, recordSubmission, startTest, submitTest } from './rules.ts'
import type { ProgressState } from './types.ts'

const dir = fileURLToPath(new URL('../../content/modules', import.meta.url))

export const curriculum: Module[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => moduleSchema.parse(JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))))
  .sort((a, b) => a.order - b.order)

export function ready(id: string) {
  const m = curriculum.find((x) => x.id === id)
  if (m?.status !== 'ready') throw new Error(`${id} is not ready`)
  return m
}

export const NOW = new Date('2026-03-10T15:00:00Z')

export function canonical(q: Question): Response {
  switch (q.answer.kind) {
    case 'choice':
      return { kind: 'choice', index: q.answer.index }
    case 'pitch-classes':
      return { kind: 'notes', notes: q.answer.notes }
    case 'text':
      return { kind: 'text', value: q.answer.accepted[0] ?? '' }
  }
}

let seq = 0

// Takes a test answering the first `right` questions correctly and leaving the rest blank.
export function takeTest(
  p: ProgressState,
  scope: { kind: 'test' | 'placement'; scopeId: string },
  graded: { questions: number; passPercent: number; mix: MixEntry[] },
  right: number,
  now = NOW,
  hinted = false,
) {
  let attempt = startTest(scope, graded.mix, graded.questions, now, createRng(`t${seq++}`))
  attempt = {
    ...attempt,
    responses: attempt.questions.map((q, i) =>
      i < right ? { ...canonical(q), ...(hinted ? { hinted } : {}) } : null,
    ),
  }
  const done = submitTest(attempt, graded.passPercent, now)
  return { progress: recordSubmission(p, done, now), attempt: done }
}

export function passTopic(p: ProgressState, moduleId: string, topicIndex: number): ProgressState {
  const topic = ready(moduleId).topics[topicIndex]
  if (topic === undefined) throw new Error('no topic')
  let next = takeTest(
    p,
    { kind: 'test', scopeId: topic.id },
    topic.test,
    topic.test.questions,
  ).progress
  for (const k of topic.katas) next = recordKata(next, k.id, k.solution, true, NOW)
  return next
}

export function passModule(p: ProgressState, moduleId: string): ProgressState {
  const m = ready(moduleId)
  let next = p
  for (let i = 0; i < m.topics.length; i++) next = passTopic(next, moduleId, i)
  return recordBoss(next, m.boss.id, bossRecord(true))
}

export const bossRecord = (passed: boolean) => ({
  submittedAt: NOW.toISOString(),
  code: 's("bd")',
  assertions: [],
  review: null,
  selfAssessed: true,
  score: passed ? 80 : 40,
  passed,
})

export const fresh = emptyProgress
