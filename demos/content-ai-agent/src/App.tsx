import ContentAiAgent from '@tiptap/extension-content-ai-agent'
import StarterKit from '@tiptap/extension-starter-kit'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Diff } from 'diff-match-patch'
import React, { useState } from 'react'

interface DiffState {
  diff: Diff[]
  accept: () => void
  reject: () => void
}

const recipes = [
  { label: 'Reverse', prompt: 'reverse' },
  { label: 'Uppercase', prompt: 'uppercase' },
]

export default function App() {
  const [diffState, setDiffState] = useState<DiffState | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      ContentAiAgent.configure({
        runAgent: async ({ text, prompt }) => {
          if (prompt === 'reverse') {
            return text.split('').reverse().join('')
          }
          return text.toUpperCase()
        },
        onDiffReady: payload => {
          setDiffState(payload)
        },
      }),
    ],
    content: '<p>Select text and run a recipe.</p>',
  })

  const run = (prompt: string) => {
    setDiffState(null)
    editor?.chain().focus().runContentAiAgent({ prompt }).run()
  }

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <aside>
        {recipes.map(r => (
          <button key={r.prompt} onClick={() => run(r.prompt)}>
            {r.label}
          </button>
        ))}
      </aside>
      <div style={{ flex: 1 }}>
        <EditorContent editor={editor} />
      </div>
      {diffState && (
        <div>
          <pre>{diffState.diff.map(part => part[1]).join('')}</pre>
          <button onClick={diffState.accept}>Accept</button>
          <button onClick={diffState.reject}>Reject</button>
        </div>
      )}
    </div>
  )
}
