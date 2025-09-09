import './styles.css'

import ContentAiAgent from '@tiptap/extension-content-ai-agent'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { Diff } from 'diff-match-patch'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Mark } from '@tiptap/core'
import { chunkDocument, rankTopK, rankTopKEmbeddings, type RankedSource } from './rag'
import { prewarmEmbeddings } from './embeddings'

interface DiffState {
  diff: Diff[]
  accept: () => void
  reject: () => void
}

type ChatRole = 'user' | 'ai'
interface ChatMessage {
  id: string
  role: ChatRole
  content?: string
  // For AI messages that carry a suggestion
  diff?: Diff[]
  accept?: () => void
  reject?: () => void
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
  const [applyDoc, setApplyDoc] = useState(false)
  const [useEmbeddings, setUseEmbeddings] = useState(false)
  const [loadingEmb, setLoadingEmb] = useState(false)
  const [embReady, setEmbReady] = useState(false)
  const [embError, setEmbError] = useState<string | null>(null)

  // Prewarm embeddings when toggled on
  useEffect(() => {
    let cancelled = false
    if (useEmbeddings && !embReady) {
      setLoadingEmb(true)
      console.log('[App] Starting embeddings prewarm...')
      prewarmEmbeddings()
        .then(ok => { 
          if (!cancelled) { 
            console.log('[App] Embeddings prewarm result:', ok)
            setEmbReady(ok)
            if (!ok) setEmbError('Failed to load model')
          }
        })
        .catch((e) => { 
          if (!cancelled) {
            console.error('[App] Embeddings prewarm error:', e)
            setEmbError(e.message || String(e))
          }
        })
        .finally(() => { if (!cancelled) setLoadingEmb(false) })
    }
    return () => { cancelled = true }
  }, [useEmbeddings, embReady])

  // Clear error once embeddings are ready
  useEffect(() => {
    if (embReady) setEmbError(null)
  }, [embReady])

  // (moved) Recompute context once embeddings become ready — see effect below editor init
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sources, setSources] = useState<RankedSource[]>([])
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([])
  const idleTimer = useRef<number | null>(null)
  const lastRunOrigin = useRef<'auto' | 'recipe' | 'chat' | null>(null)

  // Simple citations mark (local)
  const CitationMark = useMemo(() => Mark.create({
    name: 'citation',
    addAttributes() { return { sources: { default: null } } },
    parseHTML() { return [{ tag: 'span[data-citation]' }] },
    renderHTML({ HTMLAttributes }) { return ['span', { 'data-citation': '1', style: 'background:rgba(0,128,255,.08)' }, 0] },
  }), [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      CitationMark,
      ContentAiAgent.configure({
        runAgent: async ({ text, prompt }) => runStub({ text, prompt }),
        onDiffReady: payload => {
          setDiffState(payload)
          // If this diff came from chat, mirror it into the chat stream
          if (lastRunOrigin.current === 'chat') {
            setMessages(curr => {
              // Replace last pending AI message (if any) with the suggestion
              const next = [...curr]
              const idx = next.findIndex(m => m.role === 'ai' && !m.diff)
              const aiMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                role: 'ai',
                diff: payload.diff,
                accept: () => {
                  payload.accept()
                  setDiffState(null)
                  // Mark as accepted (optional: remove)
                  setMessages(ms => ms.map(x => x === next[idx] ? { ...x, content: 'Accepted' } : x))
                },
                reject: () => {
                  payload.reject()
                  setDiffState(null)
                  setMessages(ms => ms.map(x => x === next[idx] ? { ...x, content: 'Rejected' } : x))
                },
              }
              if (idx >= 0) next.splice(idx, 1, aiMsg)
              else next.push(aiMsg)
              return next
            })
          }
        },
        onSuccess: ({ editor, from, to }) => {
          // Attach selected sources as citation marks to the inserted range
          if (selectedSourceIds.length > 0) {
            const selected = sources.filter(s => selectedSourceIds.includes(s.id)).map(s => ({ id: s.id, kind: s.kind, title: s.title, uri: s.uri }))
            try {
              editor.chain().setTextSelection({ from, to }).setMark('citation', { sources: JSON.stringify(selected) }).run()
            } catch {}
          }
        },
      }),
    ],
    autofocus: 'end',
    content: '<p>Type here, select text, and run a recipe. Tab accepts, Esc rejects. Toggle auto-trigger to see suggestions as you type.</p>',
    onUpdate: ({ editor }) => {
      if (!auto) return
      // Debounce auto trigger after typing
      if (idleTimer.current) window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => {
        const { state } = editor as any
        const { from, to } = state.selection
        const sel = state.doc.textBetween(from, to, ' ')
        // Update RAG sources for the current selection
        try {
          const full = state.doc.textBetween(0, state.doc.content.size, '\n')
          const chunks = chunkDocument(full)
          const q = sel || full.slice(0, 400)
          if (useEmbeddings && embReady) {
            console.log('RAG: embeddings')
            rankTopKEmbeddings(q, chunks, 5)
              .then(ranked => {
                setSources(ranked)
                setSelectedSourceIds(ranked.slice(0, 3).map(s => s.id))
              })
              .catch(() => {
                console.log('RAG: embeddings failed, fallback to tfidf')
                const ranked = rankTopK(q, chunks, 5)
                setSources(ranked)
                setSelectedSourceIds(ranked.slice(0, 3).map(s => s.id))
              })
          } else {
            console.log('RAG: tfidf')
            const ranked = rankTopK(q, chunks, 5)
            setSources(ranked)
            setSelectedSourceIds(ranked.slice(0, 3).map(s => s.id))
          }
        } catch {}
        if (sel && sel.trim().length > 0) {
          setDiffState(null)
          lastRunOrigin.current = 'auto'
          editor.chain().focus().runContentAiAgent({ prompt: 'rewrite' }).run()
        }
      }, 800)
    },
  })

  // Recompute context once embeddings become ready
  useEffect(() => {
    if (!editor || !useEmbeddings || !embReady) return
    try {
      const state = (editor as any).state
      const full = state.doc.textBetween(0, state.doc.content.size, '\n')
      const { from, to } = state.selection
      const sel = state.doc.textBetween(from, to, ' ')
      const chunks = chunkDocument(full)
      const q = sel || full.slice(0, 400)
      rankTopKEmbeddings(q, chunks, 5)
        .then(ranked => {
          setSources(ranked)
          setSelectedSourceIds(ranked.slice(0, 3).map((s: any) => s.id))
        })
        .catch(() => {
          const ranked = rankTopK(q, chunks, 5)
          setSources(ranked)
          setSelectedSourceIds(ranked.slice(0, 3).map((s: any) => s.id))
        })
    } catch {}
  }, [editor, useEmbeddings, embReady])

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
    lastRunOrigin.current = 'recipe'
    editor?.chain().focus().runContentAiAgent({ prompt }).run()
  }

  const parsePrompt = (text: string): string => {
    const t = text.toLowerCase()
    if (t.includes('shorten')) return 'shorten'
    if (t.includes('expand')) return 'expand'
    return 'rewrite'
  }

  const sendChat = () => {
    if (!chatInput.trim()) return
    // Push user message
    setMessages(curr => [...curr, { id: `u-${Date.now()}`, role: 'user', content: chatInput }])
    const prompt = parsePrompt(chatInput)
    setChatInput('')
    // Select doc if requested
    if (applyDoc && editor) {
      try {
        const size = (editor as any).state.doc.content.size
        ;(editor as any).chain().setTextSelection({ from: 0, to: size }).run()
      } catch {}
    }
    // Add pending AI message
    setMessages(curr => [...curr, { id: `ai-p-${Date.now()}`, role: 'ai', content: 'Generating…' }])
    // Run agent
    setDiffState(null)
    lastRunOrigin.current = 'chat'
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
        <h3>
          Context
          {useEmbeddings ? (
            <span className={`badge ${loadingEmb ? 'loading' : embReady ? '' : 'muted'}`}>
              {loadingEmb ? 'Embeddings loading…' : embReady ? 'Embeddings' : 'TF‑IDF'}
            </span>
          ) : null}
        </h3>
        {embError && useEmbeddings && !loadingEmb && !embReady && (
          <div style={{ color: '#b00020', padding: '0 12px 8px 12px', fontSize: 12 }}>
            Embeddings failed to load. Using TF‑IDF fallback. Check network access for model downloads.
          </div>
        )}
        <div style={{ padding: 12 }}>
          {sources.length === 0 && <div style={{ color: '#666' }}>No context yet. Select text or type to populate.</div>}
          {sources.map(s => {
            const preview = s.text.length > 140 ? s.text.slice(0, 140) + '…' : s.text
            return (
              <label key={s.id} className="row" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={selectedSourceIds.includes(s.id)}
                  onChange={e => setSelectedSourceIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id))}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{s.title}</div>
                  <div style={{ color: '#333', fontSize: 12, marginTop: 2 }}>{preview}</div>
                  <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>score {s.score.toFixed(2)}{s.uri ? ` · ${s.uri}` : ''}</div>
                </div>
              </label>
            )
          })}
        </div>
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
          <label className="row">
            <input type="checkbox" checked={useEmbeddings} onChange={e => setUseEmbeddings(e.target.checked)} />
            Use embeddings (local)
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
          {messages.map(m => (
            <div key={m.id} className="msg">
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.role === 'user' ? 'You' : 'AI'}</div>
              {m.content && <div style={{ marginBottom: 6 }}>{m.content}</div>}
              {m.role === 'ai' && m.diff && (
                <div style={{ marginTop: 4 }}>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {m.diff.map((part, i) => {
                      const [op, t] = part
                      if (op === 0) return <span key={i}>{t}</span>
                      if (op === -1) return <span key={i} style={{ backgroundColor: '#ffcccc', textDecoration: 'line-through' }}>{t}</span>
                      return <span key={i} style={{ backgroundColor: '#ccffcc' }}>{t}</span>
                    })}
                  </pre>
                  <div className="row">
                    <button onClick={m.accept}>Accept</button>
                    <button onClick={m.reject}>Reject</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="row" style={{ marginTop: 8 }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
              placeholder="Ask AI … (e.g., ‘shorten this’)"
              onKeyDown={e => { if (e.key === 'Enter') sendChat() }}
            />
            <button onClick={sendChat}>Send</button>
          </div>
          <label className="row" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={applyDoc} onChange={e => setApplyDoc(e.target.checked)} />
            Apply to whole document
          </label>
        </div>
      </section>
    </div>
  )
}
