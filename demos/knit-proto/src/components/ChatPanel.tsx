import type { Diff } from 'diff-match-patch'
import React from 'react'

type ChatRole = 'user' | 'ai'
interface ChatMessage {
  id: string
  role: ChatRole
  content?: string
  diff?: Diff[]
  accept?: () => void
  reject?: () => void
}

interface SelectionPreviewState {
  text: string
  kind: 'selection' | 'document' | 'none'
}

export function ChatPanel(props: {
  messages: ChatMessage[]
  selectionPreview: SelectionPreviewState
  chatInput: string
  onChangeChatInput: (v: string) => void
  onSend: () => void
  applyDoc: boolean
  onToggleApplyDoc: (v: boolean) => void
}) {
  const { messages, selectionPreview, chatInput, onChangeChatInput, onSend, applyDoc, onToggleApplyDoc } = props
  let selectionLabel = 'Selection'
  if (selectionPreview.kind === 'document') {
    selectionLabel = 'Document'
  } else if (selectionPreview.kind === 'selection') {
    selectionLabel = 'Selection'
  }

  return (
    <div className="chat">
      <div className="selection-preview">
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          {selectionLabel}
          {selectionPreview.text ? ` (${selectionPreview.text.length} chars)` : ''}
        </div>
        {selectionPreview.text ? (
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
            {selectionPreview.text.length > 600 ? `${selectionPreview.text.slice(0, 600)}…` : selectionPreview.text}
          </pre>
        ) : (
          <div style={{ color: '#666' }}>No selection. Toggle “Apply to whole document” or select text.</div>
        )}
      </div>

      {messages.map(m => (
        <div key={m.id} className="msg">
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.role === 'user' ? 'You' : 'AI'}</div>
          {m.content && <div style={{ marginBottom: 6 }}>{m.content}</div>}
          {m.role === 'ai' && m.diff && (
            <div style={{ marginTop: 4 }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {m.diff.map((part, i) => {
                  const [op, t] = part
                  if (op === 0) {
                    return <span key={i}>{t}</span>
                  }
                  if (op === -1) {
                    return (
                      <span key={i} style={{ backgroundColor: '#ffcccc', textDecoration: 'line-through' }}>
                        {t}
                      </span>
                    )
                  }
                  return (
                    <span key={i} style={{ backgroundColor: '#ccffcc' }}>
                      {t}
                    </span>
                  )
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
          onChange={e => onChangeChatInput(e.target.value)}
          style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          placeholder="Ask AI … (e.g., ‘shorten this’)"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onSend()
            }
          }}
        />
        <button onClick={onSend}>Send</button>
      </div>
      <label className="row" style={{ marginTop: 6 }}>
        <input type="checkbox" checked={applyDoc} onChange={e => onToggleApplyDoc(e.target.checked)} />
        Apply to whole document
      </label>
    </div>
  )
}

export default ChatPanel
