import { useCallback, useRef, useState } from 'react'
import { chunkDocument, rankTopK, rankTopKEmbeddings, type RankedSource } from '../rag'

export function useRagContext(options: { useEmbeddings: boolean; embReady: boolean }) {
  const { useEmbeddings, embReady } = options
  const [sources, setSources] = useState<RankedSource[]>([])
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([])

  const sourcesRef = useRef<RankedSource[]>([])
  const selectedSourceIdsRef = useRef<string[]>([])

  const refresh = useCallback(async (fullText: string, query: string) => {
    const chunks = chunkDocument(fullText)
    const q = query || fullText.slice(0, 400)
    try {
      let ranked: RankedSource[]
      if (useEmbeddings && embReady) {
        ranked = await rankTopKEmbeddings(q, chunks, 5)
      } else {
        ranked = rankTopK(q, chunks, 5)
      }
      setSources(ranked)
      setSelectedSourceIds(ranked.slice(0, 3).map(s => s.id))
    } catch (e) {
      const ranked = rankTopK(q, chunks, 5)
      setSources(ranked)
      setSelectedSourceIds(ranked.slice(0, 3).map(s => s.id))
    }
  }, [useEmbeddings, embReady])

  const api = {
    sources,
    selectedSourceIds,
    setSelectedSourceIds,
    sourcesRef,
    selectedSourceIdsRef,
    refresh,
  }

  // Keep refs in sync
  sourcesRef.current = sources
  selectedSourceIdsRef.current = selectedSourceIds

  return api
}

export default useRagContext

