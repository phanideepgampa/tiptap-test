# GPT‑5 × Claude — Consolidated Plan: Collaborative AI‑Assisted Editing with RAG

This consolidated plan merges the Codex GPT‑5 plan (codex-gpt-5-plan.md) with the Claude plan (claude-code-plan.md). It defines a modular, collaboration‑safe architecture for a Cursor‑like editing experience with inline and chat‑based AI assistance, RAG/semantic context, and a knowledge‑graph of tech‑domain entities.

## Vision & Goals

- Real‑time multi‑user editing with Hocuspocus/Yjs as the source of truth
- Inline AI suggestions, chat assistance, and optional ghost‑text completions
- Selection‑aware RAG context from entities (docs, code, tickets, dashboards, pipelines)
- Knowledge‑graph integrations and entity‑aware authoring (mentions, embeds)
- Provenance/citations for AI‑generated content and auditable operations
- Enterprise‑grade permissions, approvals, and observability

## System Architecture Overview

- Editor: TipTap + extensions (modular, composable)
- Collaboration: Yjs replicated via Hocuspocus; Awareness for presence/ephemeral state
- AI Orchestration: ai‑agent‑core with tool calls; server‑side execution preferred
- RAG Context: context provider hub (rag‑context) with provider registry and caching
- Knowledge Graph: client overlays + server sync to Neo4j/Neptune (or equivalent)
- Backend Services: Hocuspocus server, LLM gateway, vector DB, KG DB, permission service, conflict resolver, document pipeline

## Core Extensions (Merged Set)

1) collab‑bridge (Hocuspocus + Yjs integration)
- Purpose: Configure provider/awareness; expose connection and presence commands.
- Depends: @tiptap/extension‑collaboration, @tiptap/extension‑collaboration‑cursor, @hocuspocus/provider, yjs.
- State: { connected, docId, provider, awareness, peers[], self, lastError? }.
- Commands: connect({ docId, token?, endpoint }), disconnect(), setPresence({ name, color, selection }), updatePresence(partial), setUserMeta(meta).
- Events: connectionChange, presenceChange, error.

2) ai‑agent‑core (collab‑aware)
- Purpose: Chat + inline assistance; emits structured tool calls; supports streaming.
- State: { status: 'idle'|'loading'|'reviewingToolCall'|'error', messages: Shared or Local, activeToolCall?, lastError? }.
- Collab: Draft/stream via awareness (optional visibility); publish finalized outputs as shared suggestions.
- Commands: run({ mode: 'inline'|'chat', prompt?, selection? }), addUserMessage(content, opts?), setMessages(messages), stop(), reset().
- Events: stateChange, loadingError, beforeToolCall, afterToolCall, stopRunning.
- Provider: pluggable LLM backends; support server‑side execution for consistency.

3) rag‑context (Context Provider Hub)
- Purpose: Build selection‑aware ContextPack from KG + external sources via provider registry.
- State: { providers[], cache, lastFetchMeta } (client), server‑backed resolution.
- Commands: refreshContext({ selection?, docMeta? }), setProviders(providers), getContext({ selection? }).
- Events: contextUpdated, contextError.
- Collab: Per‑user by default; optional sanitized shared snippets via sharedContextMap.

4) ai‑edit‑suggestions (shared)
- Purpose: Queue diffs, accept/reject, accept all; shared across users.
- Model: Y.Map<id, Suggestion> + Y.RelativePositions for anchoring.
- Commands: queueSuggestion(s), accept(id), reject(id), acceptAll(), clear(), markStale(id).
- Events: suggestionQueued, suggestionAccepted, suggestionRejected, allAccepted.
- Concurrency: soft locks (lockedBy + TTL), stale detection if anchors drift.

5) citations‑provenance (shared marks)
- Purpose: Attach sources to AI‑generated ranges.
- Mark: Citation { sources: [{ id, kind, uri, score, title? }] }.
- Commands: addCitation({ from, to, sources }), getCitationsInRange, stripCitations.
- Integration: Applied on accept() within ai‑edit‑suggestions using provenance from tool calls/context.

6) entity‑graph (content schema)
- Purpose: First‑class entity references and embeds.
- Mark: EntityMention { id, type, title? }.
- Node: EntityEmbed { id, type, attrs, view? }.
- Commands: insertEntityMention(entity), toggleEntityMention(entity), insertEntityEmbed(entity).
- Events: entityMentionAdded, entityEmbedAdded.

7) inline‑completions (ephemeral)
- Purpose: Copilot‑style ghost text at cursor.
- State: ephemeral suggestion tied to selection; awareness‑broadcast optional.
- Commands: requestCompletion, acceptCompletion, dismissCompletion.

8) checkpoints‑history (shared)
- Purpose: Named checkpoints with restore; batch operations safety net.
- Model: Y.Map<checkpointId, { timestamp, authorId, summary, snapshotMeta }>.
- Commands: setCheckpoint(summary?), restoreCheckpoint(id), listCheckpoints().

9) tool‑registry (utility)
- Purpose: Register structured tools (normalize, rephrase, insert table, refactor code block, etc.).
- Used by ai‑agent‑core to emit standardized tool calls consumed by ai‑edit‑suggestions.

10) multi‑document (workspace relations)
- Purpose: Cross‑document linking, navigation, shared context and versioned diffs.
- Features: links/backlinks, cross‑doc search, related‑docs suggestions, version tracking.
- Data: separate Y subdocs for 'relations' or dedicated room for workspace indices.

11) permissions‑workflows (policy & approvals)
- Purpose: Role‑based gating for AI triggers, approvals for sensitive operations, audit logs.
- Integration: enforced at UI + extension command level, validated server‑side.

## Hocuspocus Integration

- Server: Hocuspocus with persistence, onAuthenticate (RBAC), and hooks:
  - onChange/onStoreDocument: index content, update KG, queue server‑side AI jobs.
  - Custom extensions: AIOperationSync, EntitySync, ContextSync (as in Claude plan).
  - Subdocs: 'content', 'suggestions', 'chat', 'metadata', 'relations'.
- Client: @hocuspocus/provider configured in collab‑bridge; awareness schema:
  - { user: { id, name, color }, selection: { from, to }, agent: { busy, task, ranges[] } }.
- TipTap: Compose Collaboration + CollaborationCursor via collab‑bridge.

## Backend Services (Consolidated)

- Hocuspocus server (Yjs replication)
- LLM gateway (OpenAI/Claude/local with streaming)
- Vector DB (Pinecone/Weaviate/PGVector) for embeddings
- Knowledge Graph DB (Neo4j/Neptune) for entities/relations
- Permission service (roles, workspace/doc/AI permissions)
- Conflict resolution service (optional AI‑assisted merging)
- Entity extraction API (NER for domain entities)
- Document processing pipeline (ingest, chunk, embed, index, refresh)

## Canonical Data Models

ContextPack
```
{
  selectionSpan: { from, to },
  docMeta: { id, title?, path?, entityRefs?: Array<{ id, type }> },
  sources: Array<{ id, kind: 'doc'|'code'|'ticket'|'dashboard'|'other', uri, title?, snippet?, score }>
}
```

ToolCall
```
{ id, type: 'edit'|'insert'|'comment'|'transform', payload: { from, to, text?, meta? }, provenance?: ContextPack['sources'] }
```

Suggestion (shared)
```
{ id, authorId, createdAt, relativeFrom, relativeTo, originalHash, generated, diff: Array<[op: -1|0|1, text]>, status: 'pending'|'accepted'|'rejected'|'stale', lockedBy?, lockExpiresAt?, provenance? }
```

Message (chat)
```
{ id, role: 'user'|'ai'|'system'|'tool', content, createdAt, meta? }
```

AIOperation (shared)
```
{ id, userId, type: 'inline'|'chat'|'context', status: 'pending'|'processing'|'completed'|'failed', permissions: { canApprove: string[], requiresApproval: boolean, autoApprove: boolean }, conflictResolution: { strategy: 'latest-wins'|'merge'|'user-choice', conflictsWith: string[] }, attribution: { triggeredBy: string, approvedBy?: string, timestamp: number } }
```

ContextResult
```
{ sourceId, kind: 'doc'|'code'|'ticket'|'dashboard'|'other', title, uri, snippet?, score, meta? }
```

AgentStatus
```
'idle'|'loading'|'reviewingToolCall'|'error'
```

## Concurrency & Conflict Handling

- Anchoring with Y.RelativePositions; compute absolute ranges per client for rendering.
- Idempotent acceptance: only apply if status==pending and anchors map consistently; mark stale otherwise.
- Soft locks: lockedBy + TTL to minimize double acceptance; CRDT guarantees convergence.
- Streaming: use awareness for ephemeral tokens; publish finalized suggestions to shared types.
- Smart Conflict Resolver (advanced): AI‑assisted intent analysis and merge proposals (from Claude plan).
- Server‑side execution preferred: ensure consistency on latest snapshot; enqueue suggestions back to clients.

## Security, Privacy, Compliance

- RAG per‑user by default; sanitized shared context (opt‑in) limited to top‑k snippets.
- RBAC: enforce at Hocuspocus onAuthenticate and in extension commands.
- Audit logs for AI operations and approvals; rate limiting and quotas.
- Context sanitization to avoid leaking sensitive data in shared channels.

## Build Order (Phased)

Phase 1: Collaboration Foundation (Weeks 1–6)
- collab‑bridge, Collaboration + Cursor integration
- ai‑edit‑suggestions (shared model + decorations)
- Basic React editor shell; presence and cursors

Phase 2: AI Core + Context (Weeks 7–14)
- ai‑agent‑core (tool calls, streaming, server hookup)
- rag‑context (provider interfaces, caching, vector DB integration)
- citations‑provenance (attach on accept)

Phase 3: Knowledge & Cross‑Doc (Weeks 15–22)
- entity‑graph (mentions/embeds + extraction hooks)
- multi‑document (links, cross‑doc search, relations)
- permissions‑workflows (policies, approvals, audit)

Phase 4: UX Polish + Enterprise (Weeks 23–32)
- inline‑completions, checkpoints‑history, tool‑registry
- Performance optimizations (batching, lazy loading, context pruning)
- Observability, analytics, end‑to‑end hardening, docs

## React App Surfaces

- Collaborative editor with cursors and agent presence
- Chat panel bound to ai‑agent‑core messages/status (shared or per‑user threads)
- Suggestion tray + inline diff UI (ai‑edit‑suggestions)
- Context panel with RAG sources and actions (rag‑context)
- Citations inspector and source hovercards (citations‑provenance)
- Entity mention typeahead and rich embeds (entity‑graph)
- Cross‑doc relations navigator (multi‑document)
- Checkpoints list/restore (checkpoints‑history)
- Admin: permissions/approvals/audit dashboards (permissions‑workflows)

## Testing & Metrics

- Collab: multi‑client accept/reject, offline/rehydration, convergence checks
- Agent: streaming → finalize → publish, error fallback, stale regeneration
- RAG: permission filters, token budgets, ranking/deduping
- KG: entity add/update/relate across clients, persistence to DB
- Perf: sub‑100ms sync latency, batched updates, lazy loading
- Metrics (Claude plan): AI response <3s; context relevance >80% satisfaction; <5% manual conflict interventions

## Open Questions

- Shared vs per‑user chat default; threading model
- Scope of context sharing and sanitization policies
- Server vs client agent execution split; cost and privacy trade‑offs
- Granularity of audit logs and retention

---

This merged plan unifies collaboration‑safe AI editing, RAG context, and knowledge‑graph features with a clear extension map, Hocuspocus integration, backend services, phased delivery, and concrete data models.

## Risks & Mitigations (LLM‑Driven Dev)

- CRDT + ProseMirror lifecycle pitfalls
  - Risk: incorrect range mapping (StepMap vs Y.RelativePosition), decoration churn, stale anchors
  - Mitigation: central mapping utils with tests; anchor via RelativePositions; rebase with StepMap on apply

- Diffing vs structural edits
  - Risk: text diffs fail on lists/tables/marks and under concurrency
  - Mitigation: represent edits as ProseMirror Step JSON or tool ops; use text diffs for UX only

- Async/stream orchestration
  - Risk: race conditions (duplicate tool calls, out‑of‑order streams, stranded spinners)
  - Mitigation: operation IDs, explicit state machine, idempotent handlers, cancel/timeout, single controller

- Contract drift across extensions
  - Risk: LLM‑generated code diverges from canonical types (ToolCall, Suggestion, ContextPack)
  - Mitigation: schema‑first (Zod/JSON Schema), generate TS types, CI contract tests

- RAG token/latency budgets
  - Risk: context over‑collection, repeated embeddings, slow vector/KG queries
  - Mitigation: selection‑aware chunking, top‑k budgets, caching, batching, async refresh with fallbacks

- Provider variance & quotas
  - Risk: inconsistent SDKs, rate limits, flaky retries
  - Mitigation: provider adapter with retries/backoff, circuit breakers, deadline + partial result handling

- Prompt injection & unsafe tools
  - Risk: unscoped prompts leak PII; unsafe tool execution
  - Mitigation: templated prompts, variable whitelists, content sanitization, tool allowlist + human approvals

- Collaboration race conditions
  - Risk: double‑accepts, anchor drift, ghost awareness state
  - Mitigation: soft locks (lockedBy+TTL), precondition checks on accept, stale detection + regenerate path

- Performance in large docs
  - Risk: too many decorations/widgets, frequent awareness ticks
  - Mitigation: cap decoration density, coalesce transactions, debounce awareness updates, profiling budgets

- Observability gaps
  - Risk: hard to debug convergence and bad edits
  - Mitigation: operation/correlation IDs, structured logs, event tracing for state transitions/tool calls

- Index freshness for RAG
  - Risk: stale/irrelevant context
  - Mitigation: incremental ingest, freshness SLOs, reconciliation jobs, source‑level feature flags

- Testing determinism
  - Risk: LLM non‑determinism makes flaky tests
  - Mitigation: test mapping/anchors deterministically; snapshot tool‑call payloads; multi‑client E2E harness

