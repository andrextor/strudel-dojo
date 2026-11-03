import StrudelEditor from './StrudelEditor.tsx'

// Compact editable snippet for lessons: editor + visual, no assertions panel.
export default function Example({ code }: { code: string }) {
  return (
    <div class="my-4">
      <StrudelEditor initialCode={code} compact />
    </div>
  )
}
