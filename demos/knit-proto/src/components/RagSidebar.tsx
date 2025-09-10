import React from 'react'

export interface RankedSource {
  id: string
  title: string
  text: string
  score: number
  uri?: string
  kind?: string
}

export function RagSidebar(props: {
  useEmbeddings: boolean
  loadingEmb: boolean
  embReady: boolean
  embError: string | null
  sources: RankedSource[]
  selectedSourceIds: string[]
  onToggleSource: (id: string, checked: boolean) => void
}) {
  const { useEmbeddings, loadingEmb, embReady, embError, sources, selectedSourceIds, onToggleSource } = props
  let badgeClass = ''
  let badgeText = ''
  if (useEmbeddings) {
    if (loadingEmb) {
      badgeClass = 'loading'
      badgeText = 'Embeddings loading…'
    } else if (embReady) {
      badgeClass = ''
      badgeText = 'Embeddings'
    } else {
      badgeClass = 'muted'
      badgeText = 'TF‑IDF'
    }
  }

  return (
    <aside className="pane">
      <h3>
        Context
        {useEmbeddings ? <span className={`badge ${badgeClass}`}>{badgeText}</span> : null}
      </h3>
      {embError && useEmbeddings && !loadingEmb && !embReady && (
        <div style={{ color: '#b00020', padding: '0 12px 8px 12px', fontSize: 12 }}>
          Embeddings failed to load. Using TF‑IDF fallback. Check network access for model downloads.
        </div>
      )}
      <div style={{ padding: 12 }}>
        {sources.length === 0 && <div style={{ color: '#666' }}>No context yet. Select text or type to populate.</div>}
        {sources.map(s => {
          const preview = s.text.length > 140 ? `${s.text.slice(0, 140)}…` : s.text
          return (
            <label key={s.id} className="row" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={selectedSourceIds.includes(s.id)}
                onChange={e => onToggleSource(s.id, e.target.checked)}
              />
              <div>
                <div style={{ fontWeight: 600 }}>{s.title}</div>
                <div style={{ color: '#333', fontSize: 12, marginTop: 2 }}>{preview}</div>
                <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
                  score {s.score.toFixed(2)}
                  {s.uri ? ` · ${s.uri}` : ''}
                </div>
              </div>
            </label>
          )
        })}
      </div>
    </aside>
  )
}

export default RagSidebar
