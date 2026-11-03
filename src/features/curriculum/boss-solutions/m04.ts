// Reference piece that beats the M04 boss (curriculum.test.ts). Test-only: never imported by the app.
export const bossSolution: string | null = `stack(
  s("bd ~ sd ~, hh*8"),
  chord("<C7!4 F7!2 C7!2 G7 F7 C7 G7>").voicing().euclid(3,8).s("piano"),
  n("<[0 2 4 5]!4 [3 5 7 8]!2 [0 2 4 5]!2 [4 6 8 9] [3 5 7 8] [0 2 4 5] [4 6 8 9]>")
    .scale("C2:major").s("piano")
)`
