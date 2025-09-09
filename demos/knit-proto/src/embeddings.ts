// Local embeddings via transformers.js (MiniLM). Falls back to errors if model can't load.
// Note: Model assets are fetched at runtime; your browser must allow network access on first load.

let pipelinePromise: Promise<any> | null = null

async function getPipeline() {
  if (!pipelinePromise) {
    // Lazy load to avoid blocking first paint
    pipelinePromise = (async () => {
      const mod: any = await import('@huggingface/transformers')
      // Configure for browser environment (local files – no proxy)
      try {
        // Serve models from Vite public/ (no CORS)
        mod.env.allowRemoteModels = true
        mod.env.useBrowserCache = true
        mod.env.allowLocalModels = false
        // Files will be served from demos/knit-proto/public/models (copied to dist on build)
        // Use GitHub solution: localModelPath for local models
        // mod.env.localModelPath =  '/models/';
        // Don't use remoteURL for local models
        // mod.env.remoteURL = new URL('/models/', window.location.origin).toString();

      } catch (e) {
        console.warn('[embeddings] config error:', e)
      }
      console.log('[embeddings] loading MiniLM model …')
      const fe: any = await mod.pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { 
          progress_callback: (e: any) => {
            console.log('[embeddings]', e?.status ?? e)
            if (e?.status === 'error') {
              console.error('[embeddings] model load error:', e)
            }
          },
          // Use quantized model for better browser performance
          quantized: true,
          // Use specific revision to ensure consistency
          revision: 'main',
          // Fallback to CPU if WebGPU not available
          device: 'wasm'
        }
      )
      console.log('[embeddings] model ready')
      return fe
    })().catch(err => {
      console.error('[embeddings] Failed to load pipeline:', err)
      throw err
    })
  }
  return pipelinePromise
}

export async function embed(texts: string[]): Promise<number[][]> {
  const fe: any = await getPipeline()
  const outputs: number[][] = []
  for (const t of texts) {
    const out = await fe(t, { pooling: 'mean', normalize: true })
    // toArray() returns number[]
    outputs.push(Array.from(out.data as unknown as number[]))
  }
  return outputs
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  if (!na || !nb) return 0
  return dot / Math.sqrt(na * nb)
}

// Preload the embeddings pipeline to surface a UI loading state on toggle
export async function prewarmEmbeddings(): Promise<boolean> {
  try {
    await getPipeline()
    return true
  } catch (e) {
    return false
  }
}
