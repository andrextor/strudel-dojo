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

export const BELT_NAME_ES: Record<BeltColor, string> = {
  white: 'Blanco',
  yellow: 'Amarillo',
  orange: 'Naranja',
  green: 'Verde',
  blue: 'Azul',
  purple: 'Morado',
  brown: 'Marrón',
  red: 'Rojo',
  black: 'Negro',
  dan: 'Dan',
}
