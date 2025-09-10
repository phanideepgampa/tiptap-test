Knit Proto (TipTap + Inline/Chat AI)

Overview
- A Cursor-like editing demo on TipTap with:
  - Right-click refactor menu (Rewrite, Shorten, Expand, custom Prompt)
  - Chat prompt → inline suggestion with Accept/Reject
  - Local RAG: TF‑IDF by default, optional embeddings via transformers.js
  - Citations added on Accept when context sources are selected

Requirements
- Node.js 18+
- pnpm 9+
- Network access for model/API downloads (if using embeddings or OpenAI)

Environment
- Copy `.env.example` to `.env` in `demos/knit-proto` and set:
  - `VITE_OPENAI_API_KEY` (optional, recommended for real LLM calls)
  - `VITE_OPENAI_BASE_URL` (default `https://api.openai.com/v1`)
  - `VITE_OPENAI_MODEL` (default `gpt-4o-mini`)
- Note: Keys are used client-side in this demo. For production you should proxy calls.

Install
1) From repo root:
   - `pnpm install`

Build + Preview (dev server is not used here)
1) Build the demo:
   - `pnpm --filter knit-proto-demo build`
2) Preview locally:
   - `pnpm --filter knit-proto-demo preview`
   - Vite prints a local URL (e.g., http://localhost:4173). Open in your browser.

Quick Usage
- Select text in the editor, then right-click → choose a recipe or “Prompt…” to type instructions.
- Tab accepts the suggestion; Esc rejects it.
- Chat panel:
  - Shows “Selection” or “Document” preview (toggle “Apply to whole document”).
  - Type a prompt (e.g., “shorten by 30%; keep bullet structure”) and press Enter or click Send.
  - The model generates a diff suggestion with in-chat Accept/Reject.
- Context sidebar:
  - Shows top-k sources based on your selection or document text.
  - Check sources to include citations on Accept.
  - Toggle “Use embeddings (local)” for embeddings via transformers.js; otherwise uses TF‑IDF.

Notes
- If no `VITE_OPENAI_API_KEY` is set, the demo uses a local stub transformation.
- Embeddings load the first time you enable the toggle; a badge indicates status.
- The right-click menu is intentionally plain (no extra colors) for now.

Common Commands
- Install: `pnpm install`
- Build: `pnpm --filter knit-proto-demo build`
- Preview: `pnpm --filter knit-proto-demo preview`

