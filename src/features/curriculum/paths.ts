// Content ids → routes (spec 07): lowercase segments without the repeated prefix,
// M01-T03-K1 → /m/m01/t03/kata/k1. Pure, shared by pages and islands.
const part = (id: string, i: number) => (id.split('-')[i] ?? '').toLowerCase()

export const moduleHref = (moduleId: string) => `/m/${part(moduleId, 0)}`
export const topicHref = (topicId: string) => `${moduleHref(topicId)}/${part(topicId, 1)}`
export const testHref = (topicId: string) => `${topicHref(topicId)}/prueba`
export const kataHref = (kataId: string) => `${topicHref(kataId)}/kata/${part(kataId, 2)}`
export const bossHref = (moduleId: string) => `${moduleHref(moduleId)}/combate`
export const placementHref = (moduleId: string) => `${moduleHref(moduleId)}/ubicacion`
export const resultHref = (attemptId: string) =>
  `/resultado?intento=${encodeURIComponent(attemptId)}`

// Route segments back to ids (for getStaticPaths params): ("m01", "t03") → "M01-T03".
export const segment = (id: string, i: number) => part(id, i)
