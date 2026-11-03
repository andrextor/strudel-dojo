// Small seeded PRNG so a saved question reproduces exactly and tests stay
// deterministic. cyrb53 hashes the string seed, mulberry32 is the generator.

export interface Rng {
  next(): number // [0, 1)
  int(min: number, max: number): number // inclusive both ends
  pick<T>(arr: readonly T[]): T
  shuffle<T>(arr: readonly T[]): T[]
  weighted<T>(entries: readonly { value: T; weight: number }[]): T
}

function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createRng(seed: string): Rng {
  const next = mulberry32(cyrb53(seed) >>> 0)
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (arr) => {
      const item = arr[Math.floor(next() * arr.length)]
      if (item === undefined) throw new Error('pick from empty array')
      return item
    },
    shuffle: (arr) => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        const tmp = a[i]
        const other = a[j]
        if (tmp === undefined || other === undefined) continue
        a[i] = other
        a[j] = tmp
      }
      return a
    },
    weighted: (entries) => {
      const total = entries.reduce((sum, e) => sum + e.weight, 0)
      let r = next() * total
      for (const e of entries) {
        r -= e.weight
        if (r < 0) return e.value
      }
      const last = entries[entries.length - 1]
      if (last === undefined) throw new Error('weighted on empty entries')
      return last.value
    },
  }
}

// 64 random bits as hex: plenty to keep local ids unique.
export function randomId(rng: Rng): string {
  const part = () => rng.int(0, 0xffffffff).toString(16).padStart(8, '0')
  return part() + part()
}
