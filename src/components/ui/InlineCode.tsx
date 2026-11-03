// Text where `backticks` mark code (assertion messages, translated reference docs).
export default function InlineCode({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} class="font-mono text-dojo-violet">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  )
}
