// Reference piece that beats the M10 boss (curriculum.test.ts). Test-only: never imported by the app.
// Form A B C A': C major, a B section borrowing Fm, A♭ and B♭ from C minor, a generative C section.
export const bossSolution: string | null = `const drums = s("bd*4, ~ sd, hh*8").gain(0.8)
const a = stack(
  drums,
  chord("<C Am F G>").voicing().s("piano").room(0.3),
  chord("<C Am F G>").rootNotes(2).s("sawtooth").lpf(700),
  n("<[0 2 4 2] [5 4 2 0] [3 5 4 3] [4 ~ 1 ~]>").scale("C5:major").s("gm_epiano1")
)
const b = stack(
  drums,
  chord("<F Fm Ab Bb>").voicing().s("piano").attack(0.2).release(1),
  chord("<F Fm Ab Bb>").rootNotes(2).s("sawtooth").lpf(500),
  note("<[a4 c5 f5 c5] [ab4 c5 f5 c5] [eb5 c5 ab4 c5] [d5 f5 bb4 ~]>").s("gm_epiano1").delay(0.3)
)
const c = stack(
  drums.sometimesBy(0.3, (x) => x.fast(2)),
  chord("<C G>").rootNotes(2).s("sawtooth").lpf(sine.range(300, 2000).slow(4)),
  n(irand(8).segment(8)).scale("C5:major").s("gm_epiano1").pan(rand).room(0.5)
)
arrange([4, a], [4, b], [4, c], [4, a])`
