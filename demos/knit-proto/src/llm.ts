/**
 * Minimal LLM adapter for the knit-proto demo.
 *
 * OpenAI-compatible HTTP API (browser fetch). Configure via Vite env:
 *    - VITE_OPENAI_API_KEY
 *    - VITE_OPENAI_BASE_URL (default: https://api.openai.com/v1)
 *    - VITE_OPENAI_MODEL (default: gpt-4o-mini)
 * If no key is set, callers should fall back to a local stub.
 */

export function llmAvailable(): boolean {
  const key = import.meta.env.VITE_OPENAI_API_KEY
  return Boolean(key)
}

export interface ContextItem {
  title?: string
  text: string
  uri?: string
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

export async function runLLMTransform(options: {
  text: string
  instruction: 'rewrite' | 'shorten' | 'expand' | string
  context?: ContextItem[]
}): Promise<string> {
  const { text, instruction } = options
  const context = options.context ?? []

  // Call OpenAI-compatible API directly from the browser
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {throw new Error('Missing VITE_OPENAI_API_KEY')}

  const baseUrl = (import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'

  const sys = [
    'You are a concise, careful writing assistant embedded in a text editor.',
    'You will transform the user-selected text according to an instruction.',
    'Output only the transformed text with no commentary or markdown fences.',
    'Preserve formatting and meaning unless the instruction says otherwise.',
    'If context is provided, use it only to improve clarity or correctness; do not invent facts.',
  ].join(' ')

  const ctxBlock = context.length
    ? `\n\nContext (may be used, optional):\n${context.map((c, i) => `[#${i + 1}] ${c.title ? `${c.title  } — ` : ''}${(c.text || '').slice(0, 800)}`).join('\n')}`
    : ''

  const user = [`Instruction: ${instruction}`, 'Text to transform:', '"""', text, '"""', ctxBlock].join('\n')

  // OpenAI chat.completions
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!res.ok) {
    const msg = await safeText(res)
    throw new Error(`OpenAI error ${res.status}: ${msg}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {throw new Error('Invalid OpenAI response')}
  return content.trim()
}
