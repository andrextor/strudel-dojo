// Spaced review (spec 03): which skills are due and a 10-question set that leans on the weak
// and stale ones. Pure: `now` and the seed are passed in. The Leitner box itself is updated by
// bumpSkill in progress/rules.ts on every graded answer.
import { createRng } from '../../lib/random.ts'
import type { MixEntry, Module, StageOutline } from '../curriculum/schema.ts'
import { generateQuestion, registry } from '../exercises/registry.ts'
import type { Question } from '../exercises/types.ts'
import { isModuleUnlocked, unitStatus } from '../progress/rules.ts'
import type { ProgressState, SkillStat } from '../progress/types.ts'

// Days to wait before a skill in each box is due again (index = box 1–5).
export const BOX_DAYS = [0, 0, 1, 3, 7, 14] as const
const DAY = 86_400_000

const daysSince = (stat: SkillStat, now: Date) =>
  stat.lastSeen === ''
    ? Number.POSITIVE_INFINITY
    : (now.getTime() - Date.parse(stat.lastSeen)) / DAY

const interval = (box: number) => BOX_DAYS[Math.min(5, Math.max(1, box))] ?? 0

export const isDue = (stat: SkillStat, now: Date) => daysSince(stat, now) >= interval(stat.box)

// The box decides first (each box down is worth 10); time past the box's interval adds up to
// 10 more, so a long-forgotten skill can climb at most one box above a fresh one.
export function priority(stat: SkillStat, now: Date): number {
  const box = Math.min(5, Math.max(1, stat.box))
  const overdue = Math.min(10, daysSince(stat, now) / Math.max(1, interval(box)))
  return (6 - box) * 10 + overdue
}

// Practice mixes of every unlocked topic and open unit, grouped by the skill each generator trains.
export function reviewMixes(
  p: ProgressState,
  curriculum: Module[],
  stages: StageOutline[],
): Map<string, MixEntry[]> {
  const mixes = new Map<string, MixEntry[]>()
  const add = (entry: MixEntry) => {
    const skill = registry.get(entry.generator)?.skill
    if (skill) mixes.set(skill, [...(mixes.get(skill) ?? []), entry])
  }
  for (const m of curriculum) {
    if (m.status !== 'ready' || !isModuleUnlocked(p, curriculum, m)) continue
    for (const t of m.topics) {
      for (const entry of t.practice.mix) add(entry)
    }
  }
  for (const stage of stages) {
    for (const unit of stage.units) {
      const status = unitStatus(p, curriculum, stages, stage, unit)
      if (status === 'locked' || status === 'needs_theory') continue
      for (const entry of unit.practice?.mix ?? []) add(entry)
    }
  }
  return mixes
}

// Skills already practised, unlocked and due today, most urgent first.
export function dueSkills(
  stats: ProgressState['skillStats'],
  unlocked: ReadonlySet<string>,
  now: Date,
): string[] {
  return Object.entries(stats)
    .filter(([skill, stat]) => unlocked.has(skill) && isDue(stat, now))
    .sort(([, a], [, b]) => priority(b, now) - priority(a, now))
    .map(([skill]) => skill)
}

export function buildReviewSet(
  p: ProgressState,
  curriculum: Module[],
  stages: StageOutline[],
  now: Date,
  seed: string,
  count = 10,
): Question[] {
  const mixes = reviewMixes(p, curriculum, stages)
  const weighted = Object.entries(p.skillStats)
    .filter(([skill]) => mixes.has(skill))
    .map(([skill, stat]) => ({ value: skill, weight: priority(stat, now) }))
  if (weighted.length === 0) return []
  const weightOf = new Map(weighted.map((w) => [w.value, w.weight]))

  const used = new Set<string>()
  const picked: Question[] = []
  for (let i = 0; i < count * 3 && picked.length < count; i++) {
    const rng = createRng(`${seed}:review:${i}`)
    const mix = mixes.get(rng.weighted(weighted)) ?? []
    const entry = rng.weighted(mix.map((e) => ({ value: e, weight: e.weight })))
    try {
      picked.push(generateQuestion(entry, `${seed}:${i}`, used))
    } catch {
      // That skill ran out of fresh questions for this set; another draw fills the slot.
    }
  }
  // The weakest skill goes first, so the session opens with what needs it most.
  return picked.sort((a, b) => (weightOf.get(b.skill) ?? 0) - (weightOf.get(a.skill) ?? 0))
}
