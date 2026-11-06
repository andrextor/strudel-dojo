// Content ids → routes (spec 07): lowercase segments without the repeated prefix,
// M01-T03 → /m/m01/t03. Pure, shared by pages and islands.
const part = (id: string, i: number) => (id.split('-')[i] ?? '').toLowerCase()

export const moduleHref = (moduleId: string) => `/m/${part(moduleId, 0)}`
export const topicHref = (topicId: string) => `${moduleHref(topicId)}/${part(topicId, 1)}`
export const testHref = (topicId: string) => `${topicHref(topicId)}/prueba`
export const stageHref = (stageId: string) => `/strudel/${part(stageId, 0)}`
export const unitHref = (unitId: string) => `${stageHref(unitId)}/${part(unitId, 1)}`
export const bossHref = (stageId: string) => `${stageHref(stageId)}/combate`
// The whole id, so a kata's URL does not depend on where it sits in the course.
export const kataHref = (kataId: string) => `/strudel/kata/${kataId.toLowerCase()}`
export const examHref = (moduleId: string) => `${moduleHref(moduleId)}/examen`
export const resultHref = (attemptId: string) =>
  `/resultado?intento=${encodeURIComponent(attemptId)}`

// Route segments back to ids (for getStaticPaths params): ("m01", "t03") → "M01-T03".
export const segment = (id: string, i: number) => part(id, i)
