// Reference piece that beats the M06 boss (curriculum.test.ts). Test-only: never imported by the app.
export const bossSolution: string | null = `stack(
  note("d2").s("sawtooth").sustain(1).lpf(500).room(0.6),
  chord("<Dm G Dm G Dm G Em G>").voicing().s("piano"),
  n("<[0 2 5 4] [5 4 2 ~] [0 2 5 7] [5 ~ 4 2] [2 4 5 4] [7 5 4 5] [4 2 1 2] [0 ~ ~ ~]>")
    .scale("D4:dorian").gain("1 0.7 0.9 0.7").s("piano")
)`
