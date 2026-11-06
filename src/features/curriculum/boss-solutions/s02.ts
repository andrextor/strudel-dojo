// Reference piece that beats the S02 boss (curriculum.test.ts). Test-only: never imported by the app.
export const bossSolution = `stack(
  note("c2 ~ c2 g1").s("sawtooth").lpf(600),
  note("<[c3,e3,g3] [a2,c3,e3]>").s("triangle").attack(0.4).release(1).room(0.6)
)`
