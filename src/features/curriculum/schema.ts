// Zod schemas for the content collections. Defined with astro/zod so both
// content.config.ts (build-time validation) and the Node tests can import them
// without touching astro:* virtual modules.
import { z } from 'astro/zod'

export const BELTS = [
  'white',
  'yellow',
  'orange',
  'green',
  'blue',
  'purple',
  'brown',
  'red',
  'black',
  'dan',
] as const

const moduleId = z.string().regex(/^M\d{2}$/)
const topicId = z.string().regex(/^M\d{2}-T\d{2}$/)
const kataId = z.string().regex(/^M\d{2}-T\d{2}-K\d$/)
const bossId = z.string().regex(/^M\d{2}-BOSS$/)

const nonEmptyNames = z.array(z.string().min(1)).min(1)

// Kata/boss assertions: discriminated union by type (see docs/specs/04).
export const assertionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('usesFunction'), names: nonEmptyNames }),
  z.object({ type: z.literal('avoidsFunction'), names: nonEmptyNames }),
  z.object({ type: z.literal('soundsInclude'), names: nonEmptyNames }),
  z.object({
    type: z.literal('eventsPerCycle'),
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().nonnegative().optional(),
    filter: z.string().optional(),
  }),
  z.object({
    type: z.literal('notesWithinScale'),
    scale: z.string().min(1),
    minRatio: z.number().min(0).max(1).optional(),
  }),
  z.object({ type: z.literal('pitchClassesInclude'), pitchClasses: nonEmptyNames }),
  z.object({
    type: z.literal('noteSequence'),
    pitchClasses: z.array(z.string().min(1)).min(1),
    voice: z.enum(['all', 'lowest', 'highest']),
    cycle: z.number().int().nonnegative().optional(),
  }),
  z.object({ type: z.literal('chordPerCycle'), chords: nonEmptyNames }),
  z.object({
    type: z.literal('harmonicIntervals'),
    interval: z.string().min(1),
    minRatio: z.number().min(0).max(1),
  }),
  z.object({ type: z.literal('distinctMelodicIntervals'), min: z.number().int().positive() }),
  z.object({ type: z.literal('maxVoiceLeap'), semitones: z.number().int().nonnegative() }),
  z.object({ type: z.literal('rootsPerBar'), roots: nonEmptyNames }),
  z.object({ type: z.literal('rhythmEquals'), reference: z.string().min(1) }),
  z.object({
    type: z.literal('matchesReference'),
    code: z.string().min(1),
    transposeBy: z.string().optional(),
  }),
  z.object({
    type: z.literal('characteristicNoteRatio'),
    mode: z.string().min(1),
    minRatio: z.number().min(0).max(1),
  }),
])

export const mixEntrySchema = z.object({
  generator: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
  weight: z.number().int().positive(),
})

const practiceSchema = z.object({ mix: z.array(mixEntrySchema).min(1) })

const gradedSchema = z.object({
  questions: z.number().int().positive(),
  passPercent: z.number().int().min(1).max(100),
  mix: z.array(mixEntrySchema).min(1),
})

export const kataSchema = z.object({
  id: kataId,
  title: z.string().min(1),
  brief: z.string().min(1),
  starter: z.string(),
  solution: z.string().min(1),
  cycles: z.number().int().positive(),
  assertions: z.array(assertionSchema).min(1),
  hints: z.array(z.string().min(1)).optional(),
})

export const bossSchema = z.object({
  id: bossId,
  title: z.string().min(1),
  brief: z.string().min(1),
  starter: z.string(),
  cycles: z.number().int().positive(),
  assertions: z.array(assertionSchema).min(1),
  rubric: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        weight: z.number().int().positive(),
      }),
    )
    .min(1),
  passScore: z.number().int().positive(),
})

const skills = z.array(z.string().min(1)).min(1)

const topicReadySchema = z.object({
  id: topicId,
  title: z.string().min(1),
  goal: z.string().min(1),
  lesson: z.string().min(1),
  skills,
  practice: practiceSchema,
  test: gradedSchema,
  katas: z.array(kataSchema).min(1),
})

const topicDraftSchema = z.object({
  id: topicId,
  title: z.string().min(1),
  goal: z.string().min(1),
  skills,
})

const moduleBase = {
  id: moduleId,
  order: z.number().int().positive(),
  belt: z.enum(BELTS),
  title: z.string().min(1),
  summary: z.string().min(1),
  prerequisite: moduleId.nullable(),
}

const placementSchema = z.object({
  questions: z.number().int().positive(),
  passPercent: z.number().int().min(1).max(100),
  mix: z.array(mixEntrySchema).min(1),
})

export const moduleSchema = z.discriminatedUnion('status', [
  z.object({
    ...moduleBase,
    status: z.literal('ready'),
    placement: placementSchema.optional(),
    topics: z.array(topicReadySchema).length(4),
    boss: bossSchema,
  }),
  z.object({
    ...moduleBase,
    status: z.literal('draft'),
    topics: z.array(topicDraftSchema).length(4),
  }),
])

export const lessonSchema = z.object({
  topic: topicId,
  title: z.string().min(1),
})

export type Assertion = z.infer<typeof assertionSchema>
export type Kata = z.infer<typeof kataSchema>
export type Boss = z.infer<typeof bossSchema>
export type MixEntry = z.infer<typeof mixEntrySchema>
export type Module = z.infer<typeof moduleSchema>
export type Lesson = z.infer<typeof lessonSchema>
