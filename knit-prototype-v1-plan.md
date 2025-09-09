# Knit Prototype V1 — No-Backend First, With Local Embeddings + LAN Collab

This plan mirrors the "KNIT Requirements – V1" and adds precise implementation details for a local-only prototype with optional LAN collaboration.

## Scope (V1)

- Single-user by default; optional LAN collaboration via local Hocuspocus server.
- No backend for RAG; local embeddings in browser.
- Workspace UI similar to VSCode: split panes, tabs, sidebars.
- Document widgets: paragraphs, lists, code, tables (basic).
- Inline AI suggestions with auto and manual triggers; Tab accept, Esc reject.
- Chat window with diff preview and Accept/Reject controls.
- RAG context panel using local embeddings from open/local docs/entities.
- Knowledge graph (local): entity mentions + at least one external entity linking.
- Export to PDF (choose this in V1; collaboration supported on LAN).
- Persist UI state and data in localStorage/IndexedDB.

Out of Scope (per requirements):
- User management/login; global workspace hotkeys; template management; backend RAG; token usage accounting.

## Extensions (Lite, Local-First)

- ai-agent-lite (extend existing ContentAiAgent)
  - Triggers: manual (toolbar/chat) and auto (idle after typing or selection change; toggleable).
  - Hotkeys: Tab = accept current suggestion; Esc = reject.
  - Emits suggestions; no direct edits; integrates with diff panel and chat.

- ai-edit-suggestions-lite
  - Manages current suggestion + small queue; inline decorations; compact widget.
  - Commands: queueSuggestion, accept, reject, acceptAll, clear.

- chat-panel-bridge (UI glue)
  - Chat messages (user/ai); AI replies generate suggestions.
  - In-message Accept/Reject that focus the related diff.

- rag-context-local (embeddings in browser)
  - Embeddings: transformers.js (Xenova/all-MiniLM-L6-v2), WebGPU/wasm when available.
  - Chunk by paragraph/sentences (200–400 chars, overlap 50–100); cosine similarity; top-k (3–5).
  - Index stored in IndexedDB; incremental updates on save/idle.

- entity-mention-lite (mark)
  - Mark: { id, type, title?, url? }; quick picker + "Add external link".

- citations-lite (mark)
  - On Accept, attach selected RAG sources to inserted ranges as citation marks.

- collab-bridge (optional LAN collaboration)
  - Yjs + Hocuspocus wrapper; presence + cursors; connect/disconnect; setPresence.

## React App (Workspace)

- Layout: left Context/Entities panel, center Editor tabs, right Chat panel. Resizable splits.
- Toolbar: Recipes (Rewrite/Shorten/Expand), Auto-Trigger toggle, Tag Entity, Accept All, Export to PDF.
- Inline Suggestions: decorations, Tab/Esc hotkeys, compact bubble widget.
- Chat: message list, prompt box, Apply to selection/doc toggle; AI messages show diffs + Accept/Reject.
- Context Sidebar: top-k sources from rag-context-local; checkboxes to include citations on Accept.
- Entities Panel: list/create entity; attach one external link; clicking filters context.
- Export: one-click export using print CSS or html2pdf.js.

## LAN Collaboration (Optional for V1)

- Start Hocuspocus server on one laptop:
  - Bind to all interfaces (0.0.0.0) on port 8080; ensure firewall allows the port.
  - Get LAN IP (e.g., 192.168.x.x). Others connect to ws://<LAN_IP>:8080.
- Client config:
  - Use @tiptap/extension-collaboration and -cursor with HocuspocusProvider.
  - This is a tiny local backend solely for realtime sync; no cloud services.
- Caveats:
  - Some Wi-Fi routers enable client isolation; disable it or hotspot.
  - For internet use, switch to wss:// and add basic auth (post-V1).

## Data & Persistence

- suggestions: extension state; persisted ephemeral only if desired.
- messages: localStorage.
- entities + links: localStorage; referenced as marks in doc.
- rag index: IndexedDB (vectors + metadata); background updates on idle/save.
- settings: auto-trigger on/off, top-k, panel visibility, in localStorage.

## Milestones

- M1: Inline Recipes + Diff + Hotkeys
  - Manual trigger; Tab/Esc; accept/reject applies edits.

- M2: Chat → Suggestion
  - Chat panel; AI reply produces suggestion; in-chat Accept/Reject.

- M3: Local RAG + Citations
  - transformers.js embeddings; top-k sources; Accept attaches citation marks.

- M4: Knowledge Graph (Local)
  - Entity mentions; external link; context reacts to entity selection.

- M5: LAN Collaboration + Export to PDF
  - Hocuspocus + cursors/presence; export works; persist UI state.

## Validation Checklist

- Select text → run recipe → diff appears → Tab accepts, Esc rejects.
- Chat prompt → suggestion appears; Accept/Reject works from chat.
- Entity added → appears in Entities; Context shows related sources.
- Accept attaches citation marks with chosen sources.
- LAN: two laptops on same Wi-Fi see each other’s edits and cursors.
- Export to PDF produces readable document with accepted edits and widgets.

## Upgrade Path (Post‑V1)

- Streaming AI responses; multi-model provider; prompt templates.
- Server RAG (vector DB + KG); real entity extraction; permissions.
- Robust suggestion anchoring with Y.RelativePosition + Step rebase; conflict resolver.
- Multi-document and cross-doc relations; batch operations; checkpoints.

