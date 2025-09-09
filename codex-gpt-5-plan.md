# Codex GPT-5 Plan — Collaborative AI-Assisted Editing with RAG

This plan outlines a multi-user, collaborative document editing experience with inline and chat-based AI assistance, backed by a domain-aware RAG/semantic context and a knowledge-graph of entities (documents, pipelines, tickets, dashboards, code repos, etc.). It integrates TipTap, Hocuspocus (Yjs), and a modular set of extensions.

## Goals

- Real-time multi-user collaboration on rich-text documents
- Inline AI suggestions and chat-driven assistance
- RAG context infused from domain entities via a knowledge graph
- Provenance/citations for AI-generated text
- Conflict-tolerant, collaboration-safe workflows (suggestions, accept/reject, checkpoints)

## Architectural Principles

- Source of truth: Yjs document replicated via Hocuspocus.
- Separation of concerns: content vs. collaboration vs. AI vs. context vs. provenance.
- Ephemeral vs. shared: Use Yjs Awareness for ephemeral presence/state; use shared types (Y.Map/Y.Array/Subdocs) for persistent/shared state (chat, suggestions, metadata).
- Collaboration-safe AI: Agent operates on snapshots, anchors suggestions with RelativePositions, and applies changes via normal transactions that synchronize through Yjs.
- Least-privilege context: Per-user RAG context is computed with permissions, not broadcast; only minimal provenance is stored when needed.

## Updated Extension Set

1) collab-bridge (Hocuspocus + Yjs integration)
- Purpose: One place to configure the provider, awareness, connection lifecycle, and expose commands/events to app/UI.
- Depends on: @tiptap/extension-collaboration, @tiptap/extension-collaboration-cursor, @hocuspocus/provider, yjs.
- State: { connected, docId, provider, awareness, peers[], self, lastError? }.
- Commands: connect({docId, token?, endpoint}), disconnect(), setPresence({name, color, selection}), updatePresence(partial), setUserMeta(meta).
- Events: connectionChange, presenceChange, error.
- Notes: Registers awareness schema (user, selection, agent activity) and normalizes presence updates from other extensions.

2) ai-agent-core (collab-aware)
- Purpose: Single “brain” for chat + inline assist and tool calls; integrates selection-aware RAG.
- State: { status: 'idle'|'loading'|'reviewingToolCall'|'error', messages: Shared or Local, activeToolCall?, lastError? }.
- Collab: 
  - Ephemeral drafting/streaming via awareness (author-only or optionally visible to peers).
  - Finalized outputs become suggestions in ai-edit-suggestions shared type.
- Commands: run({mode: 'inline'|'chat', prompt?, selection?}), addUserMessage(content, opts?), setMessages(messages), stop(), reset().
- Events: stateChange, loadingError, beforeToolCall, afterToolCall, stopRunning.
- Provider API: pluggable backends; supports server-executed agent to avoid local divergence.

3) rag-context (per-user)
- Purpose: Build selection-aware ContextPack from the knowledge graph (entities, docs, code, tickets, dashboards).
- State: { providers[], cache, lastFetchMeta } (client), server-backed resolution.
- Commands: refreshContext({selection?, docMeta?}), setProviders(providers), getContext({selection?}).
- Events: contextUpdated, contextError.
- Collab: Results are per-user; not synchronized. Only summarized provenance is attached on accept.

4) ai-edit-suggestions (shared)
- Purpose: Review workflow: queue diffs, accept/reject, accept all. Shared across users.
- Shared model (Yjs): suggestions: Y.Map<id, Suggestion>, plus Yjs RelativePositions.
- Suggestion: { id, authorId, createdAt, relativeFrom, relativeTo, originalHash, generated, diff, status: 'pending'|'accepted'|'rejected'|'stale', provenance? }.
- Commands: queueSuggestion(s), accept(id), reject(id), acceptAll(), clear(), markStale(id).
- Events: suggestionQueued, suggestionAccepted, suggestionRejected, allAccepted.
- Decorations: Derived locally from shared suggestions to render inline diffs and controls.
- Concurrency: Soft lock with suggestion.lockedBy + TTL; stale detection if anchors drift too far.

5) citations-provenance (shared marks)
- Purpose: Track sources for AI-generated text.
- Mark: Citation { sources: [{id, kind, uri, score, title?}] }.
- Commands: addCitation({from,to,sources}), getCitationsInRange, stripCitations.
- Applied on accept() in ai-edit-suggestions using provenance from tool call/context.

6) entity-graph (content schema)
- Purpose: First-class entity references and embeds.
- Mark: EntityMention { id, type, title? }.
- Node: EntityEmbed { id, type, attrs, view? }.
- Commands: insertEntityMention(entity), toggleEntityMention(entity), insertEntityEmbed(entity).
- Events: entityMentionAdded, entityEmbedAdded.
- Supports extraction for RAG and UI previews/backlinks.

7) inline-completions (ephemeral)
- Purpose: Copilot-style ghost text at cursor.
- State: ephemeral suggestion tied to selection; awareness-broadcast optional.
- Commands: requestCompletion, acceptCompletion, dismissCompletion.
- Notes: Accept writes normal transactions; ephemeral state is not persisted.

8) checkpoints-history (shared)
- Purpose: Named checkpoints with restore.
- Shared model: Y.Map<checkpointId, { timestamp, authorId, summary, snapshotMeta }>
- Commands: setCheckpoint(summary?), restoreCheckpoint(id), listCheckpoints().
- Notes: Can integrate with ai-edit-suggestions to checkpoint before batch apply.

9) tool-registry (utility)
- Purpose: Register structured tools (normalize, rephrase, insert table, refactor code block, etc.).
- Used by ai-agent-core to emit standardized tool calls consumed by ai-edit-suggestions.

## Hocuspocus Integration

- Server: Run Hocuspocus with:
  - Persistence adapter (DB or S3+DB) for Yjs docs.
  - onAuthenticate for authz (document-level + role-based permissions).
  - onChange/onStoreDocument hooks to index content, update the knowledge graph, and trigger server-side AI post-processing if needed.
  - Optional subdocs per doc: 'content', 'suggestions', 'chat', 'metadata', enabling independent persistence.
- Client: Use @hocuspocus/provider in collab-bridge.
  - Awareness schema: { user: {id,name,color}, selection: {from,to}, agent: {busy, task, ranges[]} }.
  - Connection lifecycle commands + events for React glue.
- TipTap: Compose with @tiptap/extension-collaboration and @tiptap/extension-collaboration-cursor, configured via collab-bridge.

## Data Models (Canonical Types)

ContextPack
```
{
  selectionSpan: { from, to },
  docMeta: { id, title?, path?, entityRefs?: Array<{id,type}> },
  sources: Array<{ id, kind: 'doc'|'code'|'ticket'|'dashboard'|'other', uri, title?, snippet?, score }>
}
```

ToolCall
```
{
  id: string,
  type: 'edit'|'insert'|'comment'|'transform',
  payload: { from, to, text?, meta? },
  provenance?: ContextPack['sources']
}
```

Suggestion (shared)
```
{
  id: string,
  authorId: string,
  createdAt: number,
  relativeFrom: string, // encoded Y.RelativePosition
  relativeTo: string,   // encoded Y.RelativePosition
  originalHash: string,
  generated: string,
  diff: Array<[op: -1|0|1, text: string]>,
  status: 'pending'|'accepted'|'rejected'|'stale',
  lockedBy?: string,
  lockExpiresAt?: number,
  provenance?: Array<{ id, kind, uri, score, title? }>
}
```

Message (chat)
```
{ id, role: 'user'|'ai'|'system'|'tool', content, createdAt, meta? }
```

AgentStatus
```
'idle'|'loading'|'reviewingToolCall'|'error'
```

## Concurrency & Conflict Handling

- Anchoring: Use Y.RelativePosition for suggestion ranges; map to absolute positions per client for rendering.
- Idempotency: Accept applies only if suggestion.status==pending and anchor mapping is consistent; otherwise mark stale and optionally re-run generation.
- Soft-locking: lockedBy + TTL to reduce “double accept”. The actual write is still CRDT-safe.
- Streaming: Stream tokens locally (awareness) until completion; only publish finalized suggestion to shared type.
- Server-side execution: Prefer server agent for consistency; executes on the latest stored snapshot; sends tool calls back to clients (via WebSocket event or queued suggestion documents).

## Security & Privacy

- RAG per-user: Do not replicate raw context to other users.
- Provenance: Store minimal source identifiers; avoid sensitive content in the doc unless explicitly accepted.
- AuthN/Z: Hocuspocus onAuthenticate to assert doc access and roles (owner, editor, viewer).
- Rate limits and quotas for AI calls; circuit breakers for error bursts.

## Build Order

1. Collaboration foundation
   - collab-bridge (connectivity + awareness)
   - Configure Collaboration + CollaborationCursor
2. ai-edit-suggestions (shared model + decorations)
3. ai-agent-core (tool calls, streaming skeleton, integrate with suggestions)
4. rag-context (provider interfaces + caching, server integration)
5. citations-provenance (marks + integration on accept)
6. entity-graph (marks/nodes + commands)
7. inline-completions (ephemeral)
8. checkpoints-history (shared)
9. tool-registry (utility)

## React App Surfaces

- Editor surface with collaboration cursors and agent presence
- Chat panel bound to ai-agent-core messages/status
- Suggestion tray + inline diff UI from ai-edit-suggestions
- Context sidebar (rag-context) with per-user results and “Add Source” actions
- Source hovercards and citation inspector (citations-provenance)
- Entity mention/typeahead and rich embeds (entity-graph)
- Checkpoint list/restore UI (checkpoints-history)

## Testing Strategy

- Collab: multiple clients accept/reject the same suggestion; ensure CRDT convergence.
- Offline/rehydration: client goes offline, rejoins; anchors and suggestions remain valid or marked stale.
- RAG: permissions filters and token budgets; context deduping and ranking.
- Agent: streaming → finalize → publish suggestion; error fallback; stale regeneration.
- Security: unauthorized provider connection, awareness spoofing, doc access revocation.

## Hocuspocus in the Plan

- Immediate: Use Hocuspocus as the Yjs provider for content + shared models (suggestions, chat, metadata). Expose connection/presence via collab-bridge.
- Short term: Add persistence to support restarts and history. Hook onChange to update KG indexers.
- Medium term: Introduce server “agent worker” co-located with Hocuspocus to run AI jobs on server snapshots and enqueue tool calls as shared suggestions.

---

This plan yields modular, collaboration-safe AI assistance with clear extension boundaries and a well-defined integration of Hocuspocus for real-time sync.

