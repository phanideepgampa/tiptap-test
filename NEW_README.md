# Knit — Collaborative AI‑Assisted Editing

Knit weaves people, knowledge, and AI together in a real‑time editor built on TipTap, Hocuspocus (Yjs), and modular extensions. It delivers inline AI suggestions, chat assistance, and RAG context from your tech domain (code, tickets, dashboards, pipelines), with provenance and enterprise guardrails.

## Key Capabilities

- Real‑time multi‑user editing (Hocuspocus/Yjs)
- Inline AI edits with accept/reject and citations
- Chat‑based assistance and optional ghost‑text completions
- RAG context from knowledge graph entities (repos, tickets, dashboards, pipelines)
- Cross‑document intelligence and permissions/approvals

## Project Layout (Highlights)

- `packages/extension-content-ai-agent`: Prototype AI agent extension (diff preview + accept/reject)
- `packages/contracts`: Shared types (ToolCall, Suggestion, ContextPack, Message, AgentStatus, etc.)
- `tasks/backlog.yaml`: Machine‑readable tasks for incremental, agent‑friendly delivery
- `sessions/`: Logs of multi‑session progress with acceptance and verification
- `demos/content-ai-agent`: Demo app for AI suggestions
- `demos/collab-harness`: Minimal Hocuspocus/Yjs harness for convergence tests

## How to Contribute (Humans or Agents)

1) Pick the next pending task in `tasks/backlog.yaml`.
2) Create a branch: `git switch -c knit/<area>-<task-id>`.
3) Create a session note from `sessions/template.md`.
4) Implement within the `allowed_files` for the task.
5) Validate: run listed commands (e.g., `pnpm -r build`).
6) Update session note and set task status to `done`.
7) Open a PR using the provided template.

## Quick Commands

- Install: `pnpm install`
- Build all: `pnpm -r build`
- Preview next task (GitHub Action): run `Next Task Preview` via Actions → workflow_dispatch
- Collab harness: see `demos/collab-harness/README.md`

## Notes

- Use types from `@tiptap-suite/contracts` to prevent drift.
- Keep tasks small (1–3 files touched) for rapid review and safe automation.

