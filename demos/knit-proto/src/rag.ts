// Simple local RAG with TF-IDF fallback. Embeddings can be added later via transformers.js.
export interface SourceItem {
  id: string
  kind: 'doc' | 'note' | 'other'
  title: string
  uri?: string
  text: string
}

export interface RankedSource extends SourceItem { score: number }

const tokenize = (t: string) => t.toLowerCase().match(/[a-z0-9]+/g) || []

export function chunkDocument(docText: string): SourceItem[] {
  const paras = docText.split(/\n{2,}/)
  return paras
    .map(p => p.trim())
    .filter(Boolean)
    .map((p, i) => ({ id: `p-${i}`, kind: 'doc', title: `Paragraph ${i + 1}`, text: p }))
}

export function rankTopK(query: string, sources: SourceItem[], k = 5): RankedSource[] {
  const qTokens = tokenize(query)
  if (qTokens.length === 0) return []
  const qSet = new Set(qTokens)
  const scored = sources.map(s => {
    const toks = tokenize(s.text)
    let overlap = 0
    for (const t of toks) if (qSet.has(t)) overlap += 1
    const score = overlap / Math.sqrt(toks.length + 1)
    return { ...s, score }
  })
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, k)
}

// Embeddings-based ranking (optional)
export async function rankTopKEmbeddings(
  query: string,
  sources: SourceItem[],
  k = 5,
): Promise<RankedSource[]> {
  const { embed, cosine } = await import('./embeddings')
  const [qVec] = await embed([query])
  const vecs = await embed(sources.map(s => s.text))
  const scored = sources.map((s, i) => ({ ...s, score: cosine(qVec, vecs[i]) }))
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, k)
}

