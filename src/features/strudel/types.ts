export interface DojoError {
  message: string // Spanish, actionable
  line: number | null // 1-based
  raw: string // original error text, shown in a <details>
}

export interface NoteEvent {
  begin: number
  end: number
  cycle: number
  midi: number | null
  pitchClass: string | null
  sound: string | null
  voice?: number
}

export interface AssertionResult {
  pass: boolean
  message: string
}

// Minimal structural view of a Strudel Pattern / Hap, checked at runtime in query.ts.
export interface PatternLike {
  queryArc(begin: number, end: number): unknown[]
}
