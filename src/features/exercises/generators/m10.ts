// M10 · Composición y live coding: motif transformations, layer roles, sound design, performance.
import { Scale } from 'tonal'
import type { Rng } from '../../../lib/random.ts'
import { diatonicTriads } from '../../theory/chords.ts'
import { formatNote } from '../../theory/notes.ts'
import type { Generator } from '../types.ts'
import { choiceQuestion, keyName, MAJOR_TONICS, strudelNote } from './_shared.ts'
import { erase, type Registered } from './erase.ts'

const asRecord = (raw: unknown): Record<string, unknown> =>
  typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}

// Picks a subset of `all` from a param list; null if any item is unknown or the list is empty.
function subset<T extends string>(raw: unknown, all: readonly T[]): T[] | null {
  if (raw === undefined) return [...all]
  if (!Array.isArray(raw) || raw.length === 0) return null
  return raw.every((x) => (all as readonly unknown[]).includes(x)) ? (raw as T[]) : null
}

// ---------- motif-transform (form) ----------

const TRANSFORMS = [
  'transposition',
  'inversion',
  'retrograde',
  'augmentation',
  'diminution',
] as const
type Transform = (typeof TRANSFORMS)[number]

const TRANSFORM_ES: Record<Transform, string> = {
  transposition: 'Transposición (secuencia)',
  inversion: 'Inversión',
  retrograde: 'Retrogradación',
  augmentation: 'Aumentación',
  diminution: 'Disminución',
}

const TRANSFORM_WHY: Record<Transform, string> = {
  transposition: 'el mismo dibujo y el mismo ritmo, movidos por grados de la escala',
  inversion: 'cada salto cambia de dirección (lo que subía, baja), con el mismo ritmo',
  retrograde: 'las mismas notas y duraciones, de atrás hacia adelante',
  augmentation: 'las mismas notas, cada una el doble de larga',
  diminution: 'las mismas notas, cada una la mitad de larga',
}

// Durations in eighth notes.
const FIGURE_ES: Record<number, string> = { 1: 'corchea', 2: 'negra', 4: 'blanca', 8: 'redonda' }

const same = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((x, i) => x === b[i])

// A motif whose retrograde and inversion can't be mistaken for each other or for a transposition.
function randomSteps(rng: Rng): number[] {
  for (;;) {
    const steps = [0, 0, 0].map(() => rng.pick([-3, -2, -1, 1, 2, 3, 0]))
    const negRev = [...steps].reverse().map((s) => -s)
    const palindrome = same(steps, [...steps].reverse())
    if (!palindrome && !same(steps, negRev) && steps.some((s) => s !== 0)) return steps
  }
}

interface MotifParams {
  tonics: string[]
  transforms: Transform[]
}

export const motifTransform: Generator<MotifParams> = {
  id: 'motif-transform',
  skill: 'form',
  parseParams(raw) {
    const r = asRecord(raw)
    const transforms = subset(r.transforms, TRANSFORMS)
    const tonics = r.tonics ?? [...MAJOR_TONICS]
    if (transforms === null || !Array.isArray(tonics) || tonics.length === 0) return null
    if (!tonics.every((t) => typeof t === 'string' && !Scale.get(`${t} major`).empty)) return null
    return { tonics: tonics as string[], transforms }
  },
  generate(params, rng) {
    const tonic = rng.pick(params.tonics)
    const transform = rng.pick(params.transforms)
    const steps = randomSteps(rng)
    const start = rng.int(0, 4)
    let at = start
    const degrees = [start, ...steps.map((s) => (at += s))]
    const durs = degrees.map(() => rng.pick([2, 4]))
    const shift = rng.pick([-3, -2, -1, 1, 2, 3])

    let vDegrees = degrees
    let vDurs = durs
    if (transform === 'transposition') vDegrees = degrees.map((d) => d + shift)
    if (transform === 'inversion') vDegrees = degrees.map((d) => 2 * start - d)
    if (transform === 'retrograde') {
      vDegrees = [...degrees].reverse()
      vDurs = [...durs].reverse()
    }
    if (transform === 'augmentation') vDurs = durs.map((d) => d * 2)
    if (transform === 'diminution') vDurs = durs.map((d) => d / 2)

    const step = Scale.steps(`${tonic}4 major`)
    const show = (ds: number[], ls: number[]) =>
      ds
        .map((d, i) => {
          const n = step(d)
          return `${formatNote(n.slice(0, -1), 'latin')}${n.slice(-1)} ${FIGURE_ES[ls[i] ?? 2]}`
        })
        .join(' · ')
    const mini = (ds: number[], ls: number[]) =>
      ds.map((d, i) => `${strudelNote(step(d))}@${ls[i]}`).join(' ')
    const total = [...durs, ...vDurs].reduce((a, b) => a + b, 0) + 4

    return choiceQuestion(
      rng,
      {
        key: `motif-transform:${tonic}:${degrees.join(',')}:${durs.join(',')}:${transform}:${transform === 'transposition' ? shift : ''}`,
        generator: 'motif-transform',
        skill: 'form',
        prompt: `Motivo en ${keyName(tonic)}: ${show(degrees, durs)}. Variación: ${show(vDegrees, vDurs)}. ¿Qué transformación es?`,
        audio: `note("${mini(degrees, durs)} ~@4 ${mini(vDegrees, vDurs)}").s("piano").slow(${total / 8})`,
        explanation: `Es una ${TRANSFORM_ES[transform].toLowerCase()}: ${TRANSFORM_WHY[transform]}.`,
      },
      TRANSFORM_ES[transform],
      rng.shuffle(Object.values(TRANSFORM_ES)),
    )
  },
}

// ---------- layer-role (arrangement) ----------

const ROLES = ['rhythm', 'bass', 'harmony', 'melody'] as const
type Role = (typeof ROLES)[number]
const ROLE_ES: Record<Role, string> = {
  rhythm: 'Ritmo (batería)',
  bass: 'Bajo',
  harmony: 'Armonía (acordes)',
  melody: 'Melodía',
}

const MODES = ['role', 'missing', 'density'] as const
type Mode = (typeof MODES)[number]

interface Layer {
  role: Role
  code: string
  text: string // what the learner reads: theory questions show no code
  audio: string
  hits: number // onsets per cycle
}

const LAYER_TONICS = ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb'] as const

const attacks = (n: number) => (n === 1 ? '1 ataque por compás' : `${n} ataques por compás`)

function makeLayer(role: Role, tonic: string, rng: Rng): Layer {
  const triads = diatonicTriads(tonic, 'major') ?? []
  const prog = [1, 6, 4, 5].map((d) => triads[d - 1]).filter((t) => t !== undefined)
  const symbols = prog.map((t) => `${t.root}${t.quality === 'minor' ? 'm' : ''}`).join(' ')
  const roots = prog.map((t) => `${t.root.toLowerCase()}2`).join(' ')
  if (role === 'rhythm') {
    const [code, hits, text] = rng.pick([
      ['s("bd sd bd sd")', 4, 'bombo y caja alternados'],
      ['s("bd ~ sd ~")', 2, 'bombo y caja con silencios'],
      ['s("bd(3,8)")', 3, 'bombo en tresillo cubano'],
      ['s("hh*8")', 8, 'hi-hat en corcheas'],
      ['s("bd*2 [~ bd] sd")', 4, 'bombo sincopado y caja'],
    ] as const)
    return { role, code, text: `${text}, ${attacks(hits)}`, audio: code, hits }
  }
  if (role === 'bass') {
    const [suffix, hits] = rng.pick([
      ['', 1],
      ['*2', 2],
    ] as const)
    const struct = rng.next() < 0.5 && suffix === ''
    const code = `note("<${roots}>${suffix}")${struct ? '.struct("x ~ x x")' : ''}`
    const count = struct ? 3 : hits
    return {
      role,
      code,
      text: `notas graves sobre la fundamental de cada acorde, ${attacks(count)}`,
      audio: `${code}.s("sawtooth")`,
      hits: count,
    }
  }
  if (role === 'harmony') {
    const [tail, hits, text] = rng.pick([
      ['', 1, 'acordes sostenidos en el registro medio'],
      ['.struct("~ x ~ x")', 2, 'acordes a contratiempo en el registro medio'],
      ['.arp("0 1 2 1")', 4, 'acordes arpegiados en el registro medio'],
    ] as const)
    const code = `chord("<${symbols}>").voicing()${tail}`
    return { role, code, text: `${text}, ${attacks(hits)}`, audio: `${code}.s("piano")`, hits }
  }
  const length = rng.pick([3, 5, 6, 8])
  const degrees = Array.from({ length }, () => rng.int(0, 7)).join(' ')
  const code = `n("${degrees}").scale("${tonic}4:major")`
  return {
    role,
    code,
    text: `una línea de notas sueltas en el registro agudo, ${attacks(length)}`,
    audio: `${code}.s("piano")`,
    hits: length,
  }
}

interface LayerParams {
  modes: Mode[]
}

export const layerRole: Generator<LayerParams> = {
  id: 'layer-role',
  skill: 'arrangement',
  parseParams(raw) {
    const modes = subset(asRecord(raw).modes, MODES)
    return modes && { modes }
  },
  generate(params, rng) {
    const mode = rng.pick(params.modes)
    const tonic = rng.pick(LAYER_TONICS)
    const missing = rng.pick(ROLES)
    const roles = rng.shuffle(ROLES).filter((r) => mode !== 'missing' || r !== missing)
    let layers = roles.map((r) => makeLayer(r, tonic, rng))
    // Density needs a single busiest layer; reroll the layers until there is one.
    while (mode === 'density') {
      const max = Math.max(...layers.map((l) => l.hits))
      if (layers.filter((l) => l.hits === max).length === 1) break
      layers = roles.map((r) => makeLayer(r, tonic, rng))
    }
    const listing = layers.map((l, i) => `capa ${i + 1}: ${l.text}`).join(' · ')
    const base = {
      generator: 'layer-role',
      skill: 'arrangement',
      audio: `stack(${layers.map((l) => l.audio).join(', ')})`,
    }
    const intro = `Un arreglo en ${keyName(tonic)} — ${listing}.`

    if (mode === 'role') {
      const k = rng.int(0, layers.length - 1)
      const layer = layers[k] as Layer
      return choiceQuestion(
        rng,
        {
          ...base,
          key: `layer-role:role:${tonic}:${layers.map((l) => l.code).join('|')}:${k}`,
          prompt: `${intro} ¿Qué papel cumple la capa ${k + 1}?`,
          explanation: `La capa ${k + 1} es ${ROLE_ES[layer.role].toLowerCase()}: ${roleWhy(layer.role)}.`,
        },
        ROLE_ES[layer.role],
        Object.values(ROLE_ES),
      )
    }
    if (mode === 'missing') {
      return choiceQuestion(
        rng,
        {
          ...base,
          key: `layer-role:missing:${tonic}:${layers.map((l) => l.code).join('|')}`,
          prompt: `${intro} De ritmo, bajo, armonía y melodía, ¿qué papel falta?`,
          explanation: `Falta ${ROLE_ES[missing].toLowerCase()}: ${roleWhy(missing)}, y ninguna capa lo hace.`,
        },
        ROLE_ES[missing],
        Object.values(ROLE_ES),
      )
    }
    const busiest = layers.reduce((m, l, i) => (l.hits > (layers[m]?.hits ?? 0) ? i : m), 0)
    const labels = layers.map((_, i) => `Capa ${i + 1}`)
    return {
      id: '',
      ...base,
      key: `layer-role:density:${tonic}:${layers.map((l) => l.code).join('|')}`,
      prompt: `${intro} ¿Qué capa es la más densa?`,
      input: { kind: 'choice', options: labels },
      answer: { kind: 'choice', index: busiest },
      explanation: `Ataques por compás: ${layers.map((l, i) => `capa ${i + 1} = ${l.hits}`).join(', ')}. La más densa es la capa ${busiest + 1}.`,
    }
  },
}

function roleWhy(role: Role): string {
  switch (role) {
    case 'rhythm':
      return 'sonidos de batería sin altura, que marcan el pulso'
    case 'bass':
      return 'las fundamentales de los acordes en el registro grave'
    case 'harmony':
      return 'acordes que forman el colchón del registro medio'
    case 'melody':
      return 'una línea de notas sueltas por encima del resto'
  }
}

// ---------- catalog generators: sound-design, performance-signal ----------

interface Entry {
  fn: string
  call: string // how it appears in code
  does: string
}

const SOUND_DESIGN: readonly Entry[] = [
  {
    fn: 'lpf',
    call: '.lpf(800)',
    does: 'Filtro pasa bajos: deja los graves y apaga los agudos (más oscuro)',
  },
  { fn: 'hpf', call: '.hpf(400)', does: 'Filtro pasa altos: quita los graves (más fino)' },
  { fn: 'lpq', call: '.lpq(10)', does: 'Resonancia del filtro: realza la frecuencia de corte' },
  { fn: 'room', call: '.room(0.6)', does: 'Reverberación: el sonido parece estar en una sala' },
  { fn: 'delay', call: '.delay(0.4)', does: 'Eco: repite el sonido un instante después' },
  { fn: 'shape', call: '.shape(0.5)', does: 'Distorsión: satura y endurece el sonido' },
  { fn: 'vowel', call: '.vowel("o")', does: 'Filtro de formantes: el sonido imita una vocal' },
  { fn: 'attack', call: '.attack(0.3)', does: 'Ataque: cuánto tarda en llegar al volumen máximo' },
  {
    fn: 'release',
    call: '.release(1)',
    does: 'Relajación: cuánto tarda en apagarse al soltar la nota',
  },
  {
    fn: 'adsr',
    call: '.adsr(".1:.2:.6:.5")',
    does: 'La envolvente completa: ataque, decaimiento, sostenimiento y relajación',
  },
  { fn: 'gain', call: '.gain(0.6)', does: 'Volumen de la capa' },
  { fn: 'pan', call: '.pan(0.2)', does: 'Posición en el estéreo: 0 izquierda, 1 derecha' },
  {
    fn: 'orbit',
    call: '.orbit(2)',
    does: 'Manda la capa a un bus propio, con su propia reverb y su propio delay',
  },
]

const PERFORMANCE: readonly Entry[] = [
  { fn: 'sine', call: 'sine', does: 'Una onda suave que sube y baja entre 0 y 1, sin parar' },
  { fn: 'saw', call: 'saw', does: 'Una rampa que sube de 0 a 1 y vuelve a 0 de golpe' },
  {
    fn: 'rand',
    call: 'rand',
    does: 'Un valor al azar en cada evento, sin relación con el anterior',
  },
  { fn: 'perlin', call: 'perlin', does: 'Azar suave: valores al azar que cambian poco a poco' },
  { fn: 'irand', call: 'irand(8)', does: 'Un número entero al azar entre 0 y n − 1' },
  {
    fn: 'range',
    call: '.range(200, 2000)',
    does: 'Lleva una señal de 0–1 al rango que elijas',
  },
  { fn: 'segment', call: '.segment(8)', does: 'Toma n muestras por ciclo de una señal continua' },
  {
    fn: 'sometimesBy',
    call: '.sometimesBy(0.3, x => x.fast(2))',
    does: 'Aplica una función a algunos eventos, con la probabilidad que indiques',
  },
  {
    fn: 'sometimes',
    call: '.sometimes(x => x.add(note(12)))',
    does: 'Aplica una función a más o menos la mitad de los eventos',
  },
  {
    fn: 'degradeBy',
    call: '.degradeBy(0.4)',
    does: 'Quita eventos al azar con la probabilidad dada',
  },
  {
    fn: 'every',
    call: '.every(4, x => x.rev())',
    does: 'Aplica una función solo un ciclo de cada n',
  },
  {
    fn: 'mask',
    call: '.mask("<1 1 1 0>")',
    does: 'Silencia el patrón donde la máscara tiene 0: entradas y cortes',
  },
]

const DIRECTIONS = ['describe', 'pick'] as const
type Direction = (typeof DIRECTIONS)[number]

interface CatalogParams {
  fns: string[]
  directions: Direction[]
}

function catalogGenerator(id: string, skill: string, catalog: readonly Entry[]) {
  const all = catalog.map((e) => e.fn)
  const gen: Generator<CatalogParams> = {
    id,
    skill,
    parseParams(raw) {
      const r = asRecord(raw)
      const fns = subset(r.functions, all)
      const directions = subset(r.directions, DIRECTIONS)
      return fns && directions && fns.length >= 4 ? { fns, directions } : null
    },
    generate(params, rng) {
      const fn = rng.pick(params.fns)
      const entry = catalog.find((e) => e.fn === fn) as Entry
      const direction = rng.pick(params.directions)
      const others = rng.shuffle(catalog.filter((e) => e !== entry))
      const base = {
        key: `${id}:${direction}:${entry.fn}`,
        generator: id,
        skill,
        explanation: `\`${entry.call}\`: ${entry.does.charAt(0).toLowerCase()}${entry.does.slice(1)}.`,
      }
      return direction === 'describe'
        ? choiceQuestion(
            rng,
            { ...base, prompt: `¿Qué hace \`${entry.call}\` en Strudel?` },
            entry.does,
            others.map((e) => e.does),
          )
        : choiceQuestion(
            rng,
            { ...base, prompt: `¿Qué función de Strudel usas para esto? ${entry.does}.` },
            entry.fn,
            others.map((e) => e.fn),
          )
    },
  }
  return gen
}

// ---------- concept generators: timbre, tension and release (no code) ----------

interface Concept {
  term: string
  does: string
}

const TIMBRE: readonly Concept[] = [
  { term: 'Ataque', does: 'Cuánto tarda el sonido en llegar a su volumen máximo' },
  { term: 'Decaimiento', does: 'Cuánto tarda en bajar del pico al nivel en que se sostiene' },
  { term: 'Sostenimiento', does: 'El nivel que mantiene mientras la nota sigue' },
  { term: 'Relajación', does: 'Cuánto tarda en apagarse cuando la nota termina' },
  { term: 'Filtro pasa bajos', does: 'Deja pasar lo grave y apaga lo agudo' },
  { term: 'Filtro pasa altos', does: 'Quita los graves y deja lo agudo' },
  { term: 'Reverberación', does: 'Hace que el sonido parezca estar en una sala' },
  { term: 'Eco', does: 'Repite el sonido un instante después' },
  { term: 'Distorsión', does: 'Ensucia y endurece el sonido al saturarlo' },
  { term: 'Onda senoidal', does: 'Un tono puro, casi sin armónicos' },
  { term: 'Onda de sierra', does: 'Un sonido brillante, lleno de armónicos' },
]

const TENSION: readonly Concept[] = [
  { term: 'Build-up', does: 'Sube poco a poco la densidad y el brillo antes de un punto alto' },
  { term: 'Corte', does: 'Todo calla un instante y vuelve el ritmo completo' },
  { term: 'Pedal', does: 'El bajo se queda en una nota mientras arriba cambia la armonía' },
  { term: 'Más densidad', does: 'Sube la tensión con más notas por compás' },
  { term: 'Registro agudo', does: 'Sube la tensión llevando las voces hacia arriba' },
  { term: 'Tónica', does: 'Libera la tensión con el acorde de reposo' },
  {
    term: 'Entrada por capas',
    does: 'Los instrumentos aparecen uno a uno para hacer crecer la pieza',
  },
  { term: 'Respiro', does: 'Baja la densidad después de un punto alto para dar contraste' },
]

function conceptGenerator(id: string, skill: string, catalog: readonly Concept[]) {
  const gen: Generator<{ directions: Direction[] }> = {
    id,
    skill,
    parseParams(raw) {
      const directions = subset(asRecord(raw).directions, DIRECTIONS)
      return directions ? { directions } : null
    },
    generate(params, rng) {
      const entry = rng.pick([...catalog])
      const direction = rng.pick(params.directions)
      const others = rng.shuffle(catalog.filter((e) => e !== entry))
      const base = {
        key: `${id}:${direction}:${entry.term}`,
        generator: id,
        skill,
        explanation: `${entry.term}: ${entry.does.charAt(0).toLowerCase()}${entry.does.slice(1)}.`,
      }
      return direction === 'describe'
        ? choiceQuestion(
            rng,
            { ...base, prompt: `¿Qué describe «${entry.term}»?` },
            entry.does,
            others.map((e) => e.does),
          )
        : choiceQuestion(
            rng,
            { ...base, prompt: `¿Cómo se llama esto? ${entry.does}.` },
            entry.term,
            others.map((e) => e.term),
          )
    },
  }
  return gen
}

export const timbreConcept = conceptGenerator('timbre-concept', 'timbre', TIMBRE)
export const tensionDevice = conceptGenerator('tension-device', 'tension-release', TENSION)

export const soundDesign = catalogGenerator('sound-design', 'sound-design', SOUND_DESIGN)
export const performanceSignal = catalogGenerator('performance-signal', 'performance', PERFORMANCE)

export const m10: Registered[] = [
  erase(motifTransform),
  erase(layerRole),
  erase(soundDesign),
  erase(performanceSignal),
  erase(timbreConcept),
  erase(tensionDevice),
]
