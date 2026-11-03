// Reference piece that beats the M08 boss (curriculum.test.ts). Test-only: never imported by the app.
export const bossSolution: string | null =
  `// Compás 2: A7 es V/ii, su Do♯ sube a Re. Compás 5: Fm, el iv de Do menor, oscurece el Fa.
// Compás 7: D♭7 sustituye a G7; comparte Fa y Si (Do♭) y el bajo baja de Re♭ a Do.
stack(
  note("<[e4 g4 c5 ~] [a4 ~ e4 ~] [f4 e4 d4 ~] [d4 f4 g4 ~] [c5 ~ f4 ~] [e4 g4 c5 ~] [b4 g4 f4 ~] c5>").s("piano"),
  note("<[c3,e3,g3] [a2,c#3,e3,g3] [d3,f3,a3,c4] [g2,b2,d3,f3] [f2,ab2,c3] [c3,e3,g3] [db3,f3,ab3,cb4] [c3,e3,g3,c4]>").s("piano")
)`
