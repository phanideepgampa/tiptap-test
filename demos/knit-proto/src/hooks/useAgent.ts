import { useMemo } from 'react'
import ContentAiAgent from '@tiptap/extension-content-ai-agent'
import type { Editor } from '@tiptap/core'
import type { Diff } from 'diff-match-patch'
import { llmAvailable, runLLMTransform } from '../llm'

export interface AgentPayload {
  editor: Editor
  diff: Diff[]
  original: string
  generated: string
  accept: () => void
  reject: () => void
}

export function useAgent(options: {
  getContext: () => Array<{ title?: string; text: string; uri?: string }>
  onDiffReady: (payload: AgentPayload) => void
  onSuccess?: (args: { editor: Editor; from: number; to: number; text: string }) => void
  onReject?: (args: { editor: Editor; from: number; to: number; text: string }) => void
  onError?: (args: { editor: Editor; error: unknown }) => void
}) {
  const { getContext, onDiffReady, onSuccess, onReject, onError } = options

  return useMemo(() => (
    ContentAiAgent.configure({
      runAgent: async ({ text, prompt }) => {
        const p = prompt ?? 'rewrite'
        const ctx = getContext()
        console.log('[Agent] runAgent()', { prompt: p?.slice?.(0, 80), textLen: text.length, usingLLM: llmAvailable(), ctx: ctx.length })
        if (llmAvailable()) {
          try {
            return await runLLMTransform({ text, instruction: p, context: ctx })
          } catch (e) {
            console.warn('[LLM] Falling back to stub due to error:', e)
          }
        }
        // Stub fallback: simple identity or trivial change
        return text
      },
      onDiffReady: payload => {
        console.log('[Agent] onDiffReady', { ops: payload.diff.length })
        onDiffReady(payload as AgentPayload)
      },
      onSuccess,
      onReject,
      onError,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [getContext, onDiffReady, onSuccess, onReject, onError])
}

export default useAgent

