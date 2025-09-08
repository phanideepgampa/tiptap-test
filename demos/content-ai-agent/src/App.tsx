import './styles.css'

import ContentAiAgent from '@tiptap/extension-content-ai-agent'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
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
    <div className="editor-container">
      <aside>
        <h3>AI Recipes</h3>
        {recipes.map(r => (
          <button key={r.prompt} onClick={() => run(r.prompt)}>
            {r.label}
          </button>
        ))}
      </aside>
      <div className="editor-wrapper">
        <h3>Editor</h3>
        <EditorContent editor={editor} />
      </div>
      {diffState && (
        <div className="diff-panel">
          <h3>AI Suggestion</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {diffState.diff.map((part, i) => {
              const [operation, text] = part
              if (operation === 0) {
                // Unchanged text
                return <span key={i}>{text}</span>
              } if (operation === -1) {
                // Deleted text (original)
                return (
                  <span key={i} style={{ backgroundColor: '#ffcccc', textDecoration: 'line-through' }}>
                    {text}
                  </span>
                )
              } 
                // Added text (new)
                return (
                  <span key={i} style={{ backgroundColor: '#ccffcc' }}>
                    {text}
                  </span>
                )
              
            })}
          </pre>
          <button onClick={diffState.accept}>Accept</button>
          <button onClick={diffState.reject}>Reject</button>
        </div>
      )}
    </div>
  )
}
