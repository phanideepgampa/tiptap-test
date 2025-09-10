import './styles.css'

import { Mark } from '@tiptap/core'
// Content AI agent configured via useAgent hook
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { Diff } from 'diff-match-patch'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import ChatPanel from './components/ChatPanel.tsx'
import ContextMenu from './components/ContextMenu.tsx'
import DiffPreview from './components/DiffPreview.tsx'
import RagSidebar from './components/RagSidebar.tsx'
import { prewarmEmbeddings } from './embeddings.ts'
import useAgent from './hooks/useAgent.ts'
import useRagContext from './hooks/useRagContext.ts'
import useSelectionPreview from './hooks/useSelectionPreview.ts'
import useSuggestionHotkeys from './hooks/useSuggestionHotkeys.ts'
import { llmAvailable } from './llm.ts'

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

// Preset prompt names handled by getInstruction()

// Note: stub transform removed in lint pass (LLM is preferred);
// fallbacks are handled within useAgent when key is absent.

function getInstruction(prompt: string): string {
  const p = (prompt || '').trim().toLowerCase()
  if (p === 'rewrite') {
    return 'Rewrite the selected text to improve clarity, grammar, and flow while preserving original meaning and voice. Keep existing formatting, lists, and code blocks. Output only the revised text.'
  }
  if (p === 'shorten') {
    return 'Shorten the selected text by about 25–35% while preserving key information, tone, and formatting. Keep bullet lists and structure. Output only the revised text.'
  }
  if (p === 'expand') {
    return 'Expand the selected text with concise clarifications or concrete examples where helpful. Maintain the original voice and keep existing formatting. Avoid redundancy. Output only the revised text.'
  }
  return prompt
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
            if (!ok) {setEmbError('Failed to load model')}
          }
        })
        .catch(e => {
          if (!cancelled) {
            console.error('[App] Embeddings prewarm error:', e)
            setEmbError(e.message || String(e))
          }
        })
        .finally(() => {
          if (!cancelled) {setLoadingEmb(false)}
        })
    }
    return () => {
      cancelled = true
    }
  }, [useEmbeddings, embReady])

  // Clear error once embeddings are ready
  useEffect(() => {
    if (embReady) {setEmbError(null)}
  }, [embReady])

  // (moved) Recompute context once embeddings become ready — see effect below editor init
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const rag = useRagContext({ useEmbeddings, embReady })
  const sources = rag.sources
  const selectedSourceIds = rag.selectedSourceIds
  const idleTimer = useRef<number | null>(null)
  const lastRunOrigin = useRef<'auto' | 'recipe' | 'chat' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  // no inline prompt state (handled inside ContextMenu)

  // Simple citations mark (local)
  const CitationMark = useMemo(
    () =>
      Mark.create({
        name: 'citation',
        addAttributes() {
          return { sources: { default: null } }
        },
        parseHTML() {
          return [{ tag: 'span[data-citation]' }]
        },
        renderHTML() {
          return ['span', { 'data-citation': '1', style: 'background:rgba(0,128,255,.08)' }, 0]
        },
      }),
    [],
  )

  const agentExt = useAgent({
    getContext: () => {
      const currSources = rag.sourcesRef.current
      const currSel = rag.selectedSourceIdsRef.current
      return currSources.filter(s => currSel.includes(s.id)).map(s => ({ title: s.title, text: s.text, uri: s.uri }))
    },
    onDiffReady: payload => {
      setDiffState(payload)
      if (lastRunOrigin.current === 'chat') {
        setMessages(curr => {
          const next = [...curr]
          const idx = next.findIndex(m => m.role === 'ai' && !m.diff)
          const aiMsg: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'ai',
            diff: payload.diff,
            accept: () => {
              payload.accept()
              setDiffState(null)
              setMessages(ms => ms.map(x => (x === next[idx] ? { ...x, content: 'Accepted' } : x)))
            },
            reject: () => {
              payload.reject()
              setDiffState(null)
              setMessages(ms => ms.map(x => (x === next[idx] ? { ...x, content: 'Rejected' } : x)))
            },
          }
          if (idx >= 0) {next.splice(idx, 1, aiMsg)}
          else {next.push(aiMsg)}
          return next
        })
      }
    },
    onSuccess: ({ editor: ed, from, to }) => {
      if (selectedSourceIds.length > 0) {
        const selected = sources
          .filter(s => selectedSourceIds.includes(s.id))
          .map(s => ({ id: s.id, kind: s.kind, title: s.title, uri: s.uri }))
        try {
          ed.chain()
            .setTextSelection({ from, to })
            .setMark('citation', { sources: JSON.stringify(selected) })
            .run()
        } catch {
          /* noop */
        }
      }
    },
  })

  const editor = useEditor({
    extensions: [StarterKit, CitationMark, agentExt],
    autofocus: 'end',
    content:
      '<p>Type here, select text, and run a recipe. Tab accepts, Esc rejects. Toggle auto-trigger to see suggestions as you type.</p>',
    onUpdate: ({ editor: ed }) => {
      if (!auto) {return}
      // Debounce auto trigger after typing
      if (idleTimer.current) {window.clearTimeout(idleTimer.current)}
      idleTimer.current = window.setTimeout(() => {
        const { state } = ed as any
        const { from, to } = state.selection
        const sel = state.doc.textBetween(from, to, ' ')
        // Update RAG sources for the current selection
        try {
          const full = state.doc.textBetween(0, state.doc.content.size, '\n')
          const q = sel || full.slice(0, 400)
          rag.refresh(full, q)
        } catch {
          /* noop */
        }
        if (sel && sel.trim().length > 0) {
          setDiffState(null)
          lastRunOrigin.current = 'auto'
          const instruction = getInstruction('rewrite')
          console.log('[Auto] trigger run', { from, to, selLen: sel.length })
          ed.chain().focus().runContentAiAgent({ prompt: instruction }).run()
        }
      }, 800)
    },
  })

  // Selection preview
  const selectionPreview = useSelectionPreview((editor as any) || null, applyDoc)

  // Recompute context once embeddings become ready
  useEffect(() => {
    if (!editor || !useEmbeddings || !embReady) {return}
    try {
      const state = (editor as any).state
      const full = state.doc.textBetween(0, state.doc.content.size, '\n')
      const { from, to } = state.selection
      const sel = state.doc.textBetween(from, to, ' ')
      const q = sel || full.slice(0, 400)
      rag.refresh(full, q)
    } catch {
      /* noop */
    }
  }, [editor, useEmbeddings, embReady])

  // Hotkeys: Tab = accept, Esc = reject / close menu
  useSuggestionHotkeys({
    diffState,
    menuOpen,
    onCloseMenu: () => setMenuOpen(false),
    onClearSuggestion: () => setDiffState(null),
  })

  const run = (prompt: string) => {
    setDiffState(null)
    lastRunOrigin.current = 'recipe'
    const instruction = getInstruction(prompt)
    const state = (editor as any)?.state
    try {
      const { from, to } = state.selection
      const sel = state.doc.textBetween(from, to, ' ')
      console.log('[UI] run()', { prompt, instruction: instruction.slice(0, 80), from, to, selLen: sel?.length })
    } catch {
      /* noop */
    }
    editor?.chain().focus().runContentAiAgent({ prompt: instruction }).run()
  }

  const sendChat = () => {
    if (!chatInput.trim()) {return}
    // Push user message
    setMessages(curr => [...curr, { id: `u-${Date.now()}`, role: 'user', content: chatInput }])
    const prompt = chatInput.trim()
    setChatInput('')
    // Select doc if requested
    if (applyDoc && editor) {
      try {
        const size = (editor as any).state.doc.content.size
        ;(editor as any).chain().setTextSelection({ from: 0, to: size }).run()
      } catch {
        /* noop */
      }
    }
    // Add pending AI message
    setMessages(curr => [...curr, { id: `ai-p-${Date.now()}`, role: 'ai', content: 'Generating…' }])
    // Run agent
    setDiffState(null)
    lastRunOrigin.current = 'chat'
    editor?.chain().focus().runContentAiAgent({ prompt }).run()
  }

  return (
    <div className="workspace">
      <RagSidebar
        useEmbeddings={useEmbeddings}
        loadingEmb={loadingEmb}
        embReady={embReady}
        embError={embError}
        sources={sources as any}
        selectedSourceIds={selectedSourceIds}
        onToggleSource={(id, checked) =>
          rag.setSelectedSourceIds(prev => (checked ? [...prev, id] : prev.filter(x => x !== id)))
        }
      />
      <main className="pane" style={{ borderRight: 'none' }}>
        <div className="toolbar">
          <span style={{ color: '#666', fontSize: 12 }}>Select text to use the Refactor menu.</span>
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
        <div
          className="editor-shell"
          onContextMenu={e => {
            if (!editor) {return}
            const sel = (editor as any).state.selection
            if (!sel || sel.empty) {return}
            e.preventDefault()
            setMenuPos({ x: e.clientX, y: e.clientY })
            setMenuOpen(true)
            try {
              const { from, to } = (editor as any).state.selection
              const text = (editor as any).state.doc.textBetween(from, to, ' ')
              console.log('[UI] contextmenu open', { x: e.clientX, y: e.clientY, from, to, selLen: text.length })
            } catch {
              /* noop */
            }
          }}
        >
          <EditorContent editor={editor} />

          <ContextMenu
            open={menuOpen}
            x={menuPos.x}
            y={menuPos.y}
            modeBadge={llmAvailable() ? 'LLM' : 'Stub'}
            onClose={() => setMenuOpen(false)}
            onRewrite={() => {
              console.log('[UI] menu click: rewrite')
              setMenuOpen(false)
              run('rewrite')
            }}
            onShorten={() => {
              console.log('[UI] menu click: shorten')
              setMenuOpen(false)
              run('shorten')
            }}
            onExpand={() => {
              console.log('[UI] menu click: expand')
              setMenuOpen(false)
              run('expand')
            }}
            onRunPrompt={p => {
              console.log('[UI] menu inline prompt run', p)
              setMenuOpen(false)
              run(p)
            }}
          />
          {diffState ? <DiffPreview diff={diffState.diff} /> : null}
          {diffState && <div className="bubble">Tab = Accept, Esc = Reject</div>}
        </div>
      </main>
      <section className="pane right">
        <h3>Chat</h3>
        <ChatPanel
          messages={messages as any}
          selectionPreview={selectionPreview}
          chatInput={chatInput}
          onChangeChatInput={setChatInput}
          onSend={sendChat}
          applyDoc={applyDoc}
          onToggleApplyDoc={setApplyDoc}
        />
      </section>
    </div>
  )
}
