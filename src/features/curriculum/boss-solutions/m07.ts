// Reference piece that beats the M07 boss (curriculum.test.ts). Test-only: never imported by the app.
// ii–V–I in C, B♭ and A♭: guide tones resolve by half step, common tones stay.
export const bossSolution: string | null =
  `note("<[f3,a3,c4,d4] [f3,g3,b3,d4] [e3,g3,b3,c4] [eb3,g3,bb3,c4] [eb3,f3,a3,c4] [d3,f3,a3,bb3] [db3,f3,ab3,bb3] [db3,eb3,g3,bb3] [c3,eb3,g3,ab3]>")
  .struct("x ~ x x")
  .s("piano")`
