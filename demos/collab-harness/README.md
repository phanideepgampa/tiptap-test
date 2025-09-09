# Collaboration Harness (Yjs + Hocuspocus)

Minimal harness to exercise multi‑client collaboration semantics, independent of React/Tiptap UI. It spins a Hocuspocus server and simulates two clients editing the same Yjs document, including a toy suggestions workflow (queue/accept).

## Why

- Verify CRDT convergence when multiple clients edit and accept suggestions.
- Validate anchoring with Y.Text positions before wiring full TipTap/ProseMirror mapping.
- Provide a reproducible script for CI and manual debugging.

## Quick Start

1) Install deps (workspace):
- pnpm install

2) Start server (terminal A):
- pnpm --filter collab-harness-demo run server

3) Run simulation (terminal B):
- pnpm --filter collab-harness-demo run simulate

Expected: Both clients converge on the same text; a queued suggestion is accepted once with idempotency checks.

## Files

- server.js — Hocuspocus server on ws://localhost:8080
- simulate.js — Two providers attach to the same Y.Doc and perform edits + suggestion accept

## Notes

- This harness uses plain Yjs/Y.Text and a shared Y.Map("suggestions"). It does not require TipTap to validate CRDT/anchoring basics.
- For TipTap integration tests, replace Y.Text edits with ProseMirror Steps via @tiptap/extension-collaboration and map anchors using y-prosemirror.
