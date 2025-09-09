# Agent Working Guide

Scope: Entire repository. This document defines how automated agents contribute code safely and consistently.

## Principles

- Contract-first: Shared types live in `packages/contracts`. Do not hand-roll duplicates.
- Small, focused changes: Keep diffs surgical and explain the intent in session notes and commit messages.
- Deterministic tests: Prefer unit tests for mapping/anchors and contract tests for payloads.
- Do not change unrelated files. Avoid large refactors unless explicitly requested.

## Extension Contracts (authoritative)

- ToolCall, Suggestion, ContextPack, Message, AgentStatus, ContextResult are defined in `packages/contracts/src/index.ts`.
- Any extension or server that emits/consumes these must import from `@tiptap-suite/contracts`.

## Coding Guidelines

- Languages: TypeScript/ESM for packages. Keep `type: module`.
- Formatting: Use existing repo Prettier/ESLint. If hooks fail, prefer fixing lint rather than skipping; skipping allowed only for docs.
- Files: Use clear names; no one-letter variables; avoid inline comments unless requested.
- ProseMirror/Yjs: Use Y.RelativePosition for collaborative anchors; StepMap for re-mapping when applying.

## Session Workflow

- Create or update a session note under `sessions/` with goal, scope, plan, files touched, and verification.
- Branch naming: `knit/<area>-<ticket|milestone>`.
- Commits: Use Conventional Commits; add `Session: YYYYMMDD-<topic>` footer.

## Backlog-Driven Autonomy

- Canonical backlog lives in `tasks/backlog.yaml`.
- Each task defines: `id`, `title`, `status`, `allowed_files[]`, `acceptance[]`, `validate[]`, `depends_on[]?`.
- Tools SHOULD:
  - Pick the first `status: pending` task (or as directed), update to `in_progress`.
  - Only edit files matching `allowed_files`.
  - Run the `validate` commands locally (build/tests). If not possible, outline exact commands for a human/CI to run.
  - On success, set `status: done`, update session notes, and open a PR.
  - On partial progress, leave `in_progress` and add notes to the session file.
- A simple preview workflow exists: `.github/workflows/next-task.yml` to print the next pending task.

## Validation

- Contract tests must pass for any change touching shared types or tool calls.
- For AI edits: ensure idempotency and precondition checks (status, anchors) before applying.

## Do-Not-Touch (without approval)

- Release tags, publishing config, and unrelated packages.
- Any secrets or keys.

## Local Testing Quick Reference

- Build workspace: `pnpm -r build`
- Test (when available): `pnpm -r test`
- Collab harness: see `demos/collab-harness/README.md`
