import { type Editor, Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import DiffMatchPatch, { type Diff } from 'diff-match-patch'

export interface ContentAiAgentOptions {
  runAgent: (options: { editor: Editor; text: string; from: number; to: number; prompt?: string }) => Promise<string>
  onStart?: (options: { editor: Editor; text: string; from: number; to: number; prompt?: string }) => void
  onDiffReady?: (options: {
    editor: Editor
    diff: Diff[]
    original: string
    generated: string
    accept: () => void
    reject: () => void
  }) => void
  onSuccess?: (options: { editor: Editor; from: number; to: number; text: string }) => void
  onReject?: (options: { editor: Editor; from: number; to: number; text: string }) => void
  onError?: (options: { editor: Editor; error: unknown }) => void
}

interface PendingRequest {
  id: string
  from: number
  to: number
}

const pluginKey = new PluginKey<{ pending: PendingRequest[] }>('content-ai-agent')

export const ContentAiAgent = Extension.create<ContentAiAgentOptions>({
  name: 'contentAiAgent',

  addOptions() {
    return {
      runAgent: ({ text }) => Promise.resolve(text),
    }
  },

  addCommands() {
    return {
      runContentAiAgent:
        options =>
        ({ editor }) => {
          const { state, view } = editor
          const { from, to } = state.selection
          const text = state.doc.textBetween(from, to, ' ')
          const id = `ai-${Date.now()}`

          this.options.onStart?.({ editor, text, from, to, prompt: options?.prompt })

          const tr = state.tr.setMeta(pluginKey, { type: 'add', id, from, to })
          view.dispatch(tr)

          this.options
            .runAgent({ editor, text, from, to, prompt: options?.prompt })
            .then(generated => {
              const dmp = new DiffMatchPatch()
              const diff = dmp.diff_main(text, generated)
              dmp.diff_cleanupSemantic(diff)

              const accept = () => {
                const insertTr = editor.state.tr
                  .insertText(generated, from, to)
                  .setMeta(pluginKey, { type: 'remove', id })
                editor.view.dispatch(insertTr)
                this.options.onSuccess?.({ editor, from, to: from + generated.length, text: generated })
              }

              const reject = () => {
                editor.view.dispatch(editor.state.tr.setMeta(pluginKey, { type: 'remove', id }))
                this.options.onReject?.({ editor, from, to, text })
              }

              this.options.onDiffReady?.({ editor, diff, original: text, generated, accept, reject })
            })
            .catch(error => {
              editor.view.dispatch(editor.state.tr.setMeta(pluginKey, { type: 'remove', id }))
              this.options.onError?.({ editor, error })
            })

          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<{ pending: PendingRequest[] }>({
        key: pluginKey,
        state: {
          init: () => ({ pending: [] }),
          apply: (tr, value) => {
            let pending = value.pending
            const meta = tr.getMeta(pluginKey)
            if (meta?.type === 'add') {
              pending = [...pending, { id: meta.id, from: meta.from, to: meta.to }]
            } else if (meta?.type === 'remove') {
              pending = pending.filter(p => p.id !== meta.id)
            }
            if (tr.docChanged) {
              pending = pending.map(p => ({
                id: p.id,
                from: tr.mapping.map(p.from),
                to: tr.mapping.map(p.to),
              }))
            }
            return { pending }
          },
        },
        props: {
          decorations: state => {
            const pluginState = pluginKey.getState(state)
            if (!pluginState || pluginState.pending.length === 0) {
              return null
            }
            const decorations: Decoration[] = []
            pluginState.pending.forEach(({ from, to }) => {
              decorations.push(Decoration.inline(from, to, { class: 'content-ai-agent-pending' }))
              decorations.push(
                Decoration.widget(to, () => {
                  const span = document.createElement('span')
                  span.className = 'content-ai-agent-spinner'
                  span.textContent = '…'
                  return span
                }),
              )
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})

export default ContentAiAgent
