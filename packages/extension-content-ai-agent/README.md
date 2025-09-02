# @tiptap/extension-content-ai-agent

Content AI Agent extension for [Tiptap](https://tiptap.dev).

## Usage

```ts
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/extension-starter-kit'
import ContentAiAgent from '@tiptap/extension-content-ai-agent'

const editor = new Editor({
  extensions: [
    StarterKit,
    ContentAiAgent.configure({
      runAgent: async ({ text }) => {
        // send `text` to your AI service
        return text.toUpperCase()
      },
      onDiffReady: ({ diff, accept, reject }) => {
        // render diff in your UI and call accept() or reject()
      },
    }),
  ],
})
```

### Options

- `runAgent`: `(args) => Promise<string>` – required function that returns the generated content.
- `onStart`: called before `runAgent` is executed.
- `onDiffReady`: called with diff information and `accept`/`reject` callbacks.
- `onSuccess`: called when the diff was accepted and content inserted.
- `onReject`: called when the diff was rejected.
- `onError`: called when `runAgent` rejects.

### Demo

A demo showcasing this extension can be found in [`demos/content-ai-agent`](../../demos/content-ai-agent).

Run it with:

```bash
pnpm --filter content-ai-agent-demo dev
```
