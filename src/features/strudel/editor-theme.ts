// CodeMirror theme from the DESIGN.md tokens. Colors are CSS variables, so light/dark follows
// the app theme with no hex here.
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

const v = (name: string) => `var(--color-dojo-${name})`

const chrome = EditorView.theme({
  '&': { backgroundColor: v('raised'), color: v('text'), height: '100%' },
  '.cm-content': { caretColor: v('torii'), fontFamily: 'var(--font-mono)', padding: '12px 0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: v('torii'), borderLeftWidth: '2px' },
  '&.cm-focused': { outline: 'none' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: `color-mix(in oklab, ${v('violet')} 30%, transparent) !important`,
  },
  '.cm-gutters': { backgroundColor: v('surface'), color: v('muted'), border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'transparent' },
  // Strudel marks the sounding mini-notation with an inline outline; restyle it per DESIGN.md.
  '.cm-line span[style*="outline"]': {
    outline: `2px solid ${v('neon')} !important`,
    backgroundColor: `color-mix(in oklab, ${v('neon')} 20%, transparent)`,
    borderRadius: '3px',
  },
})

const highlight = HighlightStyle.define([
  { tag: [tags.string, tags.special(tags.string)], color: v('gold') },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: v('violet') },
  { tag: [tags.propertyName, tags.variableName], color: v('violet') },
  { tag: [tags.number, tags.bool], color: v('neon') },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment],
    color: v('muted'),
    fontStyle: 'italic',
  },
  { tag: [tags.keyword, tags.operator, tags.punctuation, tags.bracket], color: v('text') },
])

export const dojoTheme = [chrome, syntaxHighlighting(highlight)]
