import './styles.css'

import ContentAiAgent from '@tiptap/extension-content-ai-agent'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { Diff } from 'diff-match-patch'
import React, { useEffect, useMemo, useRef, useState } from 'react'

interface DiffState {
  diff: Diff[]
  accept: () => void
  reject: () => void
}

const recipes = [
  { label: 'Rewrite', prompt: 'rewrite' },
  { label: 'Shorten', prompt: 'shorten' },
  { label: 'Expand', prompt: 'expand' },
]

function runStub({ text, prompt }: { text: string; prompt?: string }): string {
  if (!prompt || prompt === 'rewrite') {
    return text
      .split(/([.!?]\s+)/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ')
  }
  if (prompt === 'shorten') {
    const words = text.split(/\s+/)
    return words.slice(0, Math.max(1, Math.floor(words.length * 0.6))).join(' ')
  }
  // expand
  return `${text} ${text.length > 0 ? '…' : ''}`
}

export default function App() {
  const [diffState, setDiffState] = useState<DiffState | null>(null)
  const [auto, setAuto] = useState(true)
  const idleTimer = useRef<number | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      ContentAiAgent.configure({
        runAgent: async ({ text, prompt }) => runStub({ text, prompt }),
        onDiffReady: payload => setDiffState(payload),
      }),
    ],
    autofocus: 'end',
    content: '<p>Type here, select text, and run a recipe. Tab accepts, Esc rejects. Toggle auto-trigger to see suggestions as you type.</p>',
    onUpdate: () => {
      if (!auto) return
      // Debounce auto trigger after typing
      if (idleTimer.current) window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => {
        const { state } = editor as any
        const { from, to } = state.selection
        const sel = state.doc.textBetween(from, to, ' ')
        if (sel && sel.trim().length > 0) {
          setDiffState(null)
          ;(editor as any).chain().focus().runContentAiAgent({ prompt: 'rewrite' }).run()
        }
      }, 800)
    },
  })

  // Hotkeys: Tab = accept, Esc = reject
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!diffState) return
      if (e.key === 'Tab') {
        e.preventDefault()
        diffState.accept()
        setDiffState(null)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        diffState.reject()
        setDiffState(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [diffState])

  const run = (prompt: string) => {
    setDiffState(null)
    editor?.chain().focus().runContentAiAgent({ prompt }).run()
  }

  const diffPreview = useMemo(() => {
    if (!diffState) return null
    return (
      <pre className="diff-panel" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {diffState.diff.map((part, i) => {
          const [operation, text] = part
          if (operation === 0) return <span key={i}>{text}</span>
          if (operation === -1) return (
            <span key={i} style={{ backgroundColor: '#ffcccc', textDecoration: 'line-through' }}>{text}</span>
          )
          return (
            <span key={i} style={{ backgroundColor: '#ccffcc' }}>{text}</span>
          )
        })}
      </pre>
    )
  }, [diffState])

  return (
    <div className="workspace">
      <aside className="pane">
        <h3>Context & Entities</h3>
        <div style={{ padding: 12, color: '#666' }}>RAG panel (V1 local embeddings) will appear here.</div>
      </aside>
      <main className="pane" style={{ borderRight: 'none' }}>
        <div className="toolbar">
          {recipes.map(r => (
            <button key={r.prompt} onClick={() => run(r.prompt)}>{r.label}</button>
          ))}
          <span className="spacer" />
          <label className="row">
            <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />
            Auto-trigger
          </label>
        </div>
        <div className="editor-shell">
          <EditorContent editor={editor} />
          {diffPreview}
          {diffState && <div className="bubble">Tab = Accept, Esc = Reject</div>}
        </div>
      </main>
      <section className="pane right">
        <h3>Chat</h3>
        <div className="chat">
          <div className="msg">Chat UI (V1) will send prompts and produce suggestions.</div>
          <div className="row">
            <input style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 6 }} placeholder="Ask AI …" />
            <button disabled>Send</button>
          </div>
        </div>
      </section>
    </div>
  )
}

