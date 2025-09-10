import type { Editor } from '@tiptap/core'
import ContentAiAgent from '@tiptap/extension-content-ai-agent'
import type { Diff } from 'diff-match-patch'
import { useMemo } from 'react'

import { llmAvailable, runLLMTransform } from '../llm.ts'

export interface AgentPayload {
  editor: Editor
  diff: Diff[]
  original: string
  generated: string
  accept: () => void
  reject: () => void
}

function classifyInstruction(instruction: string): 'rewrite' | 'shorten' | 'expand' | 'custom' {
  const t = (instruction || '').toLowerCase()
  if (t.includes('shorten') || t.includes('concise') || t.includes('summar')) {
    return 'shorten'
  }
  if (t.includes('expand') || t.includes('elaborat') || t.includes('example')) {
    return 'expand'
  }
  if (t.includes('rewrite') || t.includes('revise') || t.includes('improve')) {
    return 'rewrite'
  }
  return 'rewrite'
}

function stubTransform(text: string, instruction: string): string {
  const kind = classifyInstruction(instruction)
  if (kind === 'shorten') {
    const words = text.split(/\s+/)
    const target = Math.max(1, Math.floor(words.length * 0.65))
    return words.slice(0, target).join(' ')
  }
  if (kind === 'expand') {
    if (!text.trim()) {
      return text
    }
    const suffix = text.trim().endsWith('.') ? '' : '.'
    return `${text}${suffix} `
  }
  const parts = text
    .split(/([.!?]\s+)/)
    .map(s => s.trim())
    .filter(Boolean)
  const rewritten = parts.map(s => (s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s)).join(' ')
  return rewritten || text
}

export function useAgent(options: {
  getContext: () => Array<{ title?: string; text: string; uri?: string }>
  onDiffReady: (payload: AgentPayload) => void
  onSuccess?: (args: { editor: Editor; from: number; to: number; text: string }) => void
  onReject?: (args: { editor: Editor; from: number; to: number; text: string }) => void
  onError?: (args: { editor: Editor; error: unknown }) => void
}) {
  const { getContext, onDiffReady, onSuccess, onReject, onError } = options

  return useMemo(
    () =>
      ContentAiAgent.configure({
        runAgent: async ({ text, prompt }) => {
          const p = prompt ?? 'rewrite'
          const ctx = getContext()
          console.log('[Agent] runAgent()', {
            prompt: p?.slice?.(0, 80),
            textLen: text.length,
            usingLLM: llmAvailable(),
            ctx: ctx.length,
          })
          if (llmAvailable()) {
            try {
              return await runLLMTransform({ text, instruction: p, context: ctx })
            } catch (e) {
              console.warn('[LLM] Falling back to stub due to error:', e)
            }
          }
          // Stub fallback: provide a simple but helpful transform
          return stubTransform(text, p)
        },
        onDiffReady: payload => {
          console.log('[Agent] onDiffReady', { ops: payload.diff.length })
          onDiffReady(payload as AgentPayload)
        },
        onSuccess,
        onReject,
        onError,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
    [getContext, onDiffReady, onSuccess, onReject, onError],
  )
}

export default useAgent
