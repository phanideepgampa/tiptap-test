import React from 'react'
import type { Diff } from 'diff-match-patch'

export function DiffPreview({ diff }: { diff: Diff[] }) {
  return (
    <pre className="diff-panel" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {diff.map((part, i) => {
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
}

export default DiffPreview

