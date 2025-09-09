import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

const WS_URL = process.env.WS_URL || 'ws://localhost:8080'
const DOC_NAME = process.env.DOC_NAME || 'collab-harness-doc'

// Utility: wait
const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function main() {
  const ydocA = new Y.Doc()
  const ydocB = new Y.Doc()

  const providerA = new HocuspocusProvider({ url: WS_URL, name: DOC_NAME, document: ydocA })
  const providerB = new HocuspocusProvider({ url: WS_URL, name: DOC_NAME, document: ydocB })

  const textA = ydocA.getText('content')
  const textB = ydocB.getText('content')
  const suggA = ydocA.getMap('suggestions')
  const suggB = ydocB.getMap('suggestions')

  // Log helpers
  const logState = (label) => {
    console.log(label, { A: textA.toString(), B: textB.toString(), suggA: suggA.size, suggB: suggB.size })
  }

  providerA.on('status', ({ status }) => console.log('[A] status', status))
  providerB.on('status', ({ status }) => console.log('[B] status', status))

  // Wait for connections
  await wait(500)

  // Seed initial text from A
  textA.insert(0, 'Hello world')
  await wait(200)
  logState('After seed:')

  // Simulate a queued suggestion on A: replace 'world' with 'Universe'
  const from = 6, to = 11
  const suggestion = {
    id: `s-${Date.now()}`,
    from,
    to,
    original: 'world',
    generated: 'Universe',
    status: 'pending',
  }
  suggA.set(suggestion.id, suggestion)
  await wait(200)
  logState('After queue suggestion:')

  // Accept suggestion from B (simulate other user)
  const s = suggB.get(suggestion.id)
  if (s && s.status === 'pending') {
    textB.delete(s.from, s.to - s.from)
    textB.insert(s.from, s.generated)
    s.status = 'accepted'
    suggB.set(s.id, s)
  }
  await wait(400)
  logState('After accept on B:')

  // Idempotency: A tries to accept same suggestion again (should detect already accepted)
  const s2 = suggA.get(suggestion.id)
  if (s2 && s2.status !== 'pending') {
    console.log('[A] suggestion already resolved:', s2.status)
  }

  // Both documents should converge
  await wait(400)
  logState('Final:')

  providerA.destroy()
  providerB.destroy()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

