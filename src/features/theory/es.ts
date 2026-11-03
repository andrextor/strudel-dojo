// Spanish names for music terms. tonal speaks English; the UI speaks Spanish,
// so this is the single place that maps between them. Keys are tonal values.

export type Notation = 'latin' | 'american'

// Letter (American) → latin solfège name.
export const LETTER_TO_LATIN: Record<string, string> = {
  C: 'Do',
  D: 'Re',
  E: 'Mi',
  F: 'Fa',
  G: 'Sol',
  A: 'La',
  B: 'Si',
}

// Latin solfège (lowercased) → letter. Longest keys matched first by the parser.
export const LATIN_TO_LETTER: Record<string, string> = {
  do: 'C',
  re: 'D',
  mi: 'E',
  fa: 'F',
  sol: 'G',
  la: 'A',
  si: 'B',
}

// Unicode accidental glyphs ↔ ASCII used by tonal.
export const ACCIDENTAL_TO_UNICODE: Record<string, string> = {
  '##': '\u{1D12A}', // 𝄪
  bb: '\u{1D12B}', // 𝄫
  '#': '♯', // ♯
  b: '♭', // ♭
  '': '',
}

// Interval quality letter (tonal) → Spanish short letter.
// tonal uses P/M/m/A/d; Spanish uses J (justa) for perfect.
export const QUALITY_SHORT_ES: Record<string, string> = {
  P: 'J',
  M: 'M',
  m: 'm',
  A: 'A',
  d: 'd',
}

// Interval quality → long Spanish word (agreeing with the feminine "[number]a").
export const QUALITY_LONG_ES: Record<string, string> = {
  P: 'justa',
  M: 'mayor',
  m: 'menor',
  A: 'aumentada',
  d: 'disminuida',
}

// Interval number → Spanish ordinal noun (feminine).
export const INTERVAL_NUMBER_ES: Record<number, string> = {
  1: 'unísono',
  2: 'segunda',
  3: 'tercera',
  4: 'cuarta',
  5: 'quinta',
  6: 'sexta',
  7: 'séptima',
  8: 'octava',
  9: 'novena',
  10: 'décima',
  11: 'oncena',
  12: 'docena',
  13: 'trecena',
}

// Scale/mode type (tonal) → Spanish.
export const SCALE_TYPE_ES: Record<string, string> = {
  major: 'mayor',
  minor: 'menor natural',
  'harmonic minor': 'menor armónica',
  'melodic minor': 'menor melódica',
  ionian: 'jónico',
  dorian: 'dórico',
  phrygian: 'frigio',
  lydian: 'lidio',
  mixolydian: 'mixolidio',
  aeolian: 'eólico',
  locrian: 'locrio',
  'major pentatonic': 'pentatónica mayor',
  'minor pentatonic': 'pentatónica menor',
  blues: 'blues',
  'whole tone': 'tonos enteros',
  chromatic: 'cromática',
}

// Chord type aliases (tonal) → Spanish.
export const CHORD_TYPE_ES: Record<string, string> = {
  major: 'mayor',
  minor: 'menor',
  diminished: 'disminuido',
  augmented: 'aumentado',
  'major seventh': 'mayor séptima',
  'dominant seventh': 'séptima de dominante',
  'minor seventh': 'menor séptima',
  'half-diminished': 'semidisminuido',
  'diminished seventh': 'séptima disminuida',
  'minor/major seventh': 'menor con séptima mayor',
}

// Major-scale degree (1–7) → Spanish functional name.
export const DEGREE_NAME_ES: Record<number, string> = {
  1: 'tónica',
  2: 'supertónica',
  3: 'mediante',
  4: 'subdominante',
  5: 'dominante',
  6: 'superdominante',
  7: 'sensible',
}
