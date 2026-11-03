import assert from 'node:assert/strict'
import { test } from 'node:test'
import { type HintQuestion, revealsAnswer } from './hint-guard.ts'

const scale: HintQuestion = {
  prompt: 'Escribe la escala de Re mayor.',
  input: { kind: 'note-set', via: ['text'], ordered: true, count: 7 },
  answer: {
    kind: 'pitch-classes',
    notes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
    spelling: 'strict',
  },
}
const interval: HintQuestion = {
  prompt: '¿Qué intervalo hay de C4 a E4?',
  input: { kind: 'text', placeholder: '3M, 5J…' },
  answer: { kind: 'text', accepted: ['3M'] },
}
const semis: HintQuestion = {
  prompt: '¿Cuántos semitonos hay de E4 a B♭4?',
  input: { kind: 'text', placeholder: 'un número' },
  answer: { kind: 'text', accepted: ['6'] },
}
const ear: HintQuestion = {
  prompt: 'Escucha e identifica el intervalo.',
  input: { kind: 'choice', options: ['5J', '3M', '8J'] },
  answer: { kind: 'choice', index: 0 },
}
const degree: HintQuestion = {
  prompt: '¿Cómo se llama el grado 5 de Sol mayor?',
  input: { kind: 'text', placeholder: 'p. ej. dominante' },
  answer: { kind: 'text', accepted: ['dominante'] },
}

test('hints that give the answer away are rejected', () => {
  assert.ok(revealsAnswer('Recuerda que en Re mayor aparece Fa♯.', scale))
  assert.ok(revealsAnswer('La escala lleva F# y C#.', scale))
  assert.ok(revealsAnswer('Piensa en fa sostenido.', scale))
  assert.ok(revealsAnswer('Después de Re viene Mi.', scale))
  assert.ok(revealsAnswer('Es una 3M.', interval))
  assert.ok(revealsAnswer('Suena como una tercera mayor.', interval))
  assert.ok(revealsAnswer('Es un intervalo M3.', interval))
  assert.ok(revealsAnswer('Cuenta: son 6.', semis))
  assert.ok(revealsAnswer('Son seis semitonos.', semis))
  assert.ok(revealsAnswer('Suena como una quinta justa.', ear))
  assert.ok(revealsAnswer('La opción correcta es la primera.', ear))
  assert.ok(revealsAnswer('Ese grado es la dominante.', degree))
})

test('useful hints that keep the answer hidden pass', () => {
  assert.ok(
    !revealsAnswer('Sigue la fórmula T-T-S-T-T-T-S desde la tónica, una letra por grado.', scale),
  )
  assert.ok(!revealsAnswer('La escala empieza en Re: cuenta los tonos y semitonos.', scale))
  assert.ok(
    !revealsAnswer(
      'Si cuentas las letras de C a E, sabes el número; luego cuenta semitonos.',
      interval,
    ),
  )
  assert.ok(!revealsAnswer('Cuenta los semitonos tecla por tecla desde E4.', semis))
  assert.ok(!revealsAnswer('Fíjate si suena hueco y estable, o dulce como un acorde.', ear))
  assert.ok(!revealsAnswer('Es el grado que crea tensión y pide volver a la tónica.', degree))
  assert.ok(!revealsAnswer('Mi consejo: canta la escala desde la tónica.', degree))
})
