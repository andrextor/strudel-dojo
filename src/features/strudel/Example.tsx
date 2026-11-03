import { useRef } from 'preact/hooks'
import { useSenseiEnabled } from '../sensei/client.ts'
import ExplainCode from '../sensei/ExplainCode.tsx'
import StrudelEditor, { type EditorApi } from './StrudelEditor.tsx'

export default function Example({ code }: { code: string }) {
  const editor = useRef<EditorApi | null>(null)
  const sensei = useSenseiEnabled()
  return (
    <div class="my-4 space-y-2">
      <StrudelEditor
        initialCode={code}
        compact
        onReady={(api) => {
          editor.current = api
        }}
      />
      {sensei && <ExplainCode getCode={() => editor.current?.getCode() ?? code} />}
    </div>
  )
}
