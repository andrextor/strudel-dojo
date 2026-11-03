// Reference piece that beats the M09 boss (curriculum.test.ts). Test-only: never imported by the app.
export const bossSolution: string | null = `stack(
  chord("<Bm7b5 E7 Am6 Am6>").voicing().s("piano"),
  chord("<Bm7b5 E7 Am6 Am6>").rootNotes(2).s("piano"),
  n(perlin.range(0, 12).segment(8).add(irand(3)))
    .scale("<B3:locrian E3:phrygian:dominant A3:melodic:minor A3:melodic:minor>")
    .s("piano")
)`
