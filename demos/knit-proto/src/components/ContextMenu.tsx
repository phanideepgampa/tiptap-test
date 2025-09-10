import React, { useEffect, useRef, useState } from 'react'

export interface ContextMenuProps {
  open: boolean
  x: number
  y: number
  modeBadge: 'LLM' | 'Stub'
  onRewrite: () => void
  onShorten: () => void
  onExpand: () => void
  onRunPrompt: (prompt: string) => void
  onClose: () => void
}

export function ContextMenu(props: ContextMenuProps) {
  const { open, x, y, onClose, onRewrite, onShorten, onExpand, onRunPrompt, modeBadge } = props
  const ref = useRef<HTMLDivElement | null>(null)
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }
    const handler = (e: MouseEvent) => {
      const el = ref.current
      if (el && e.target instanceof Node && el.contains(e.target)) {
        return
      }
      onClose()
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) {
    return null
  }
  return (
    <div ref={ref} className="context-menu" style={{ position: 'fixed', left: x, top: y, zIndex: 1000 }}>
      <div className="menu-item">
        <button onClick={onRewrite}>Rewrite</button>
      </div>
      <div className="menu-item">
        <button onClick={onShorten}>Shorten</button>
      </div>
      <div className="menu-item">
        <button onClick={onExpand}>Expand</button>
      </div>
      <div className="menu-sep" />
      <div className="menu-inline">
        <input
          placeholder="Prompt…"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const p = prompt.trim()
              if (p) {
                onRunPrompt(p)
                setPrompt('')
              }
            } else if (e.key === 'Escape') {
              setPrompt('')
              onClose()
            }
          }}
        />
        <button
          onClick={() => {
            const p = prompt.trim()
            if (p) {
              onRunPrompt(p)
              setPrompt('')
            }
          }}
        >
          Run
        </button>
      </div>
      <div style={{ fontSize: 10, padding: '6px 8px' }}>{modeBadge}</div>
    </div>
  )
}

export default ContextMenu
