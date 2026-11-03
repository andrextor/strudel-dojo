// Kept apart from schema.ts so client code can use it without pulling in zod.
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

export type BeltColor = (typeof BELTS)[number]

export const isBelt = (v: unknown): v is BeltColor =>
  typeof v === 'string' && (BELTS as readonly string[]).includes(v)
