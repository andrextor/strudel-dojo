// XP and belt are derived from what is saved, never stored, so they cannot drift (spec 05).
import type { BeltColor } from '../curriculum/belts.ts'
import type { Module } from '../curriculum/schema.ts'
import { grade } from '../exercises/grade.ts'
import { isModulePassed, isTopicPassed } from './rules.ts'
import type { ProgressState, TestAttempt } from './types.ts'

export const XP = {
  testCorrect: 10,
  testCorrectHinted: 5,
  practiceCorrect: 2,
  practiceDailyCap: 100,
  kata: 30,
  topic: 100,
  boss: 300,
} as const

export function attemptXp(attempt: TestAttempt): number {
  if (attempt.submittedAt === null) return 0
  return attempt.questions.reduce((sum, q, i) => {
    const r = attempt.responses[i]
    if (r == null || !grade(q, r).correct) return sum
    return sum + (r.hinted === true ? XP.testCorrectHinted : XP.testCorrect)
  }, 0)
}

export function totalXp(p: ProgressState, curriculum: Module[]): number {
  // Only the best submitted attempt per test counts, so repeating one never inflates XP.
  const best = new Map<string, number>()
  for (const a of p.attempts) {
    const key = `${a.kind}:${a.scopeId}`
    best.set(key, Math.max(best.get(key) ?? 0, attemptXp(a)))
  }
  let total = [...best.values()].reduce((s, n) => s + n, 0)

  for (const day of Object.values(p.practiceDays)) {
    total += Math.min(XP.practiceDailyCap, day.correct * XP.practiceCorrect)
  }
  for (const k of Object.values(p.katas)) if (k.passedAt !== null && !k.helped) total += XP.kata

  for (const m of curriculum) {
    for (const t of m.topics) if (isTopicPassed(p, m, t)) total += XP.topic
    if (m.status === 'ready' && (p.bosses[m.boss.id] ?? []).some((r) => r.passed)) total += XP.boss
  }
  return total
}

export interface BeltRank {
  belt: BeltColor | null // belt of the last passed module, null before the first one
  next: { moduleId: string; belt: BeltColor; stripes: number } | null
}

export function beltFor(p: ProgressState, curriculum: Module[]): BeltRank {
  let belt: BeltColor | null = null
  for (const m of curriculum) {
    if (isModulePassed(p, m)) {
      belt = m.belt
      continue
    }
    const stripes = m.topics.filter((t) => isTopicPassed(p, m, t)).length
    return { belt, next: { moduleId: m.id, belt: m.belt, stripes } }
  }
  return { belt, next: null }
}
