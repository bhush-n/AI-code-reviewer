# AI Code Reviewer — React + TypeScript UI Design

**Date:** 2026-05-20
**Status:** Approved — ready for implementation planning
**Scope:** Replace the existing Streamlit UI with a professional React + TypeScript frontend, keeping the Python LangChain/Groq logic as a FastAPI backend.

---

## 1. Goals & non-goals

### Goals
- Replace the Streamlit UI with a dev-tool-grade React frontend that looks and feels native to developers.
- Keep the existing `lang_helper.py` LLM logic intact — wrap it in a FastAPI service rather than rewriting in TypeScript.
- Match the current feature set: paste code, pick language, get an AI review, save and browse past reviews.
- Ship a layout that scales later (file upload, structured findings, exports) without rework.

### Non-goals (this iteration)
- No severity-tagged findings, no line-by-line annotations, no diff view, no file upload, no GitHub repo scanning, no PDF/Markdown export. All listed in the README's "Future Enhancements" and deferred.
- No authentication, no multi-user accounts, no cloud sync.
- No mobile-first layout — desktop is the primary target; mobile gets a usable but minimal stacked view.

---

## 2. Architecture

### Stack
- **Frontend:** Vite + React 18 + TypeScript + Tailwind + shadcn/ui. Monaco Editor for code input. React Query for server state. Zustand for UI state. `react-markdown` + `rehype-highlight` for review rendering.
- **Backend:** FastAPI wrapping the existing `lang_helper.py`. SQLite for persistence (replaces `db.json`). `sse-starlette` for streaming responses.
- **Dev workflow:** `npm run dev` (Vite on `:5173`) and `uvicorn api:app --reload` (FastAPI on `:8000`). Vite proxy forwards `/api/*` to FastAPI so the dev server avoids CORS configuration.

### Why these choices
- **Python backend kept:** The LangChain pipeline and Groq integration are already working; rewriting them in TypeScript adds risk for no benefit.
- **SQLite over `db.json`:** A JSON file under concurrent writes can corrupt; SQLite is one stdlib import away and removes that whole class of bug.
- **SSE over WebSockets:** Reviews are one-way streams from server to client. SSE is simpler, works over plain HTTP, and degrades gracefully behind proxies.
- **Zustand over Redux:** UI state is small (sidebar open, current language, selected review). Redux is overkill.

### REST API
```
POST   /api/reviews              { code, language }
                                 → SSE stream of tokens, terminated by an event
                                   carrying { id, title, created_at }

GET    /api/reviews              → [{ id, title, language, created_at }, ...]
GET    /api/reviews/:id          → { id, title, code, language, response, created_at }
DELETE /api/reviews/:id          → 204
```

`POST /api/reviews` streams the LLM response token-by-token. The final SSE event includes the saved review's id, title, and timestamp so the frontend can update the history sidebar without an extra round trip.

---

## 3. Component breakdown

### Frontend
```
src/
├── App.tsx                          // Layout shell
├── main.tsx                         // Vite entry
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx               // Logo, language selector, theme toggle
│   │   ├── HistorySidebar.tsx       // Collapsible, date-grouped past reviews
│   │   └── Workspace.tsx            // Resizable split: editor | review panel
│   ├── editor/
│   │   ├── CodeEditor.tsx           // Monaco wrapper, language-aware
│   │   └── ReviewButton.tsx         // Primary CTA, loading state
│   ├── review/
│   │   ├── ReviewPanel.tsx          // Empty / streaming / done states
│   │   ├── ReviewMarkdown.tsx       // react-markdown with code highlighting
│   │   └── ReviewActions.tsx        // Copy, clear buttons
│   ├── history/
│   │   ├── HistoryItem.tsx          // One row: title + language dot + time
│   │   ├── HistoryGroup.tsx         // "Today" / "Yesterday" / older grouping
│   │   └── HistorySearch.tsx        // Client-side fuzzy filter
│   └── ui/                          // shadcn primitives
├── hooks/
│   ├── useReviews.ts                // React Query: list, get, create, delete
│   └── useStreamingReview.ts        // SSE consumer for POST /api/reviews
├── store/
│   └── ui.ts                        // Zustand: sidebarOpen, language, currentReviewId
├── lib/
│   ├── api.ts                       // fetch wrappers + types
│   └── languages.ts                 // language list + Monaco language IDs
└── styles/
    └── globals.css                  // Tailwind + theme tokens
```

### Backend
```
backend/
├── api.py                  // FastAPI app, 4 routes, SSE handler
├── lang_helper.py          // Existing file, st.secrets replaced with env var
├── db.py                   // SQLite helpers: init, insert, list, get, delete
├── requirements.txt
└── tests/
    └── test_api.py
```

Each unit has one job. `Workspace.tsx` knows about layout but not about reviews. `useStreamingReview` knows about SSE but not about UI state. `lang_helper.py` knows about LLMs but not about HTTP.

---

## 4. Visual design system

### Layout — workspace split (Approach A)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ▣ AI Code Reviewer    [Python ▾]                       ⏻ Settings   ◐     │
├──────────────┬─────────────────────────────────────────────────────────────┤
│              │                              │                              │
│  HISTORY     │   CODE EDITOR                │   AI REVIEW                  │
│              │   (Monaco, syntax-highlight) │   (markdown, streaming)      │
│  ⌕ Search    │                              │                              │
│  ▸ Pinned    │   1  def calc(x):            │   ## Bugs                    │
│              │   2    return x * 2          │   Line 2 returns ...         │
│  Today       │   3                          │                              │
│  ▸ calc fn   │                              │   ## Performance             │
│  ▸ auth bug  │                              │   ...                        │
│              │   [ Review Code  →  ⌘ + ↵ ]  │   [ ⇩ Export   ⧉ Copy ]      │
│              │                              │                              │
└──────────────┴──────────────────────────────┴──────────────────────────────┘
```

- Sidebar: 280px expanded, 56px collapsed (icons only). Resizable via drag handle.
- Workspace: vertical split between editor and review panel, draggable divider, persisted to `localStorage`.
- Below 1024px viewport, panes stack vertically: editor on top, review below, sidebar becomes a drawer.

### Color tokens

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--bg` | `#0B0B0F` | `#FFFFFF` | App background |
| `--surface` | `#13131A` | `#F7F7F9` | Sidebar, cards |
| `--surface-2` | `#1B1B24` | `#EEEEF2` | Editor bg, hover states |
| `--border` | `#26262F` | `#E4E4EA` | Dividers, input borders |
| `--text` | `#ECECF1` | `#0B0B0F` | Primary text |
| `--text-muted` | `#8A8A99` | `#6B6B7B` | Timestamps, labels |
| `--accent` | `#7C5CFF` | `#6342FF` | Primary buttons, focus rings, brand |
| `--accent-glow` | `rgba(124,92,255,0.35)` | same | Hover halo, focus ring |
| `--success` | `#22C55E` | `#16A34A` | Toasts, success badges |
| `--warning` | `#F59E0B` | `#D97706` | Validation warnings |
| `--danger` | `#EF4444` | `#DC2626` | Errors |

Dark is the default; a top-bar toggle switches to light. Choice persisted to `localStorage`, honors `prefers-color-scheme` on first visit.

### Typography
- **Sans (UI):** Inter, fallback `system-ui`. Sizes: 12, 14, 16, 20, 28px.
- **Mono (code):** JetBrains Mono, fallback `ui-monospace`. Used in Monaco and markdown code blocks.
- **Weights:** 400 body, 500 labels, 600 headings, 700 brand.

### Spacing, radius, motion
- 4px base (Tailwind defaults).
- Radius: 8px inputs/buttons, 12px cards, 16px modals.
- Motion: 150ms `ease-out` hover, 200ms `ease-in-out` panel transitions, 100ms opacity fade per streamed token.

### Hero touches
1. Subtle radial gradient (~3% accent glow) behind the editor, top-left.
2. Primary button has a `box-shadow` halo that grows on hover (`0 0 0 0` → `0 0 24px 4px var(--accent-glow)`).
3. Streaming response fades each token in with a 100ms opacity transition.
4. Language selector shows a colored dot per language (Python yellow, JS amber, TS blue).
5. Empty review state: a quiet "Paste code, hit ⌘↵" with the accent glow behind a small icon — not a stock illustration.

---

## 5. UX flows

### First-time visit
1. App loads with empty editor, empty review panel showing "Paste code, hit ⌘↵", and empty history sidebar.
2. User picks a language from the top bar (default Python, persisted to `localStorage`).
3. User pastes code. If the editor detects the language doesn't match the selected one, a non-blocking inline hint appears above the editor.
4. User clicks **Review Code** or presses ⌘↵. The button enters a loading state, the editor becomes read-only.
5. Review panel shows a 3-line skeleton, then SSE tokens fade in left-to-right.
6. On stream completion, a "Review saved" toast appears and the new entry tops the history sidebar.

### Browsing past reviews
- Sidebar groups by **Today / Yesterday / This week / Older** using `date-fns`.
- Each row: truncated title (tooltip on hover), language dot, time-ago.
- Click a row: editor loads the saved code read-only with an "↻ Edit a copy" button; review panel shows the saved response.
- Right-click: context menu with Rename and Delete (Delete requires confirmation).
- Top-of-sidebar search filters by title or code substring, client-side over the React Query cache.

### Error handling

| Scenario | UI behavior |
|---|---|
| Empty code submitted | Inline error under editor: "Paste some code first." Button shake. No request sent. |
| Network error / API down | Toast: "Couldn't reach the server. Try again." Retry in toast. Editor not locked. |
| Groq API key missing/invalid (500) | Toast: "AI service unavailable. Check GROQ_API_KEY on the server." |
| Groq rate limit (429) | Toast: "Rate limited — retrying in 5s." Auto-retry with backoff, max 2 attempts. |
| Stream drops mid-response | Review panel shows partial content + banner "Connection lost. Retry?" |

### Keyboard shortcuts
- `⌘/Ctrl + ↵` — submit review
- `⌘/Ctrl + K` — focus sidebar search
- `⌘/Ctrl + B` — toggle sidebar
- `⌘/Ctrl + L` — open language dropdown
- `Esc` — close menus, modals, drawers

---

## 6. Testing strategy

Light and focused on confidence, not coverage.

- **Backend (`pytest`):** 4 API routes. The LLM is mocked with a fake `review_code()` returning a canned string — we don't test LangChain. Covers happy path, empty-code rejection, 404 on missing id, 204 on delete. ~8 tests, sub-second runtime.
- **Frontend unit (Vitest + RTL):** Pure logic only — `lib/api.ts` request builders, date-grouping helper in `HistorySidebar`, language-mismatch detection logic. ~6 tests.
- **Frontend E2E (Playwright):** One smoke test driving the full happy path (paste → review → history updated), with MSW mocking `/api/reviews` so it runs without a Groq key.
- **No snapshot tests, no per-component render tests.** They rot fast and don't catch real bugs at this scale.

---

## 7. Repository layout & migration

### Final layout
```
AI-code-reviewer/
├── backend/
│   ├── api.py
│   ├── lang_helper.py        // moved from root
│   ├── db.py
│   ├── migrate_db.py         // one-off db.json → SQLite
│   ├── requirements.txt
│   └── tests/
│       └── test_api.py
├── frontend/
│   ├── src/                  // per Section 3
│   ├── tests/
│   │   └── e2e.spec.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example          // VITE_API_URL — only needed for production builds;
│                             // dev uses Vite proxy and leaves it empty
├── README.md                 // updated for new dev workflow
└── .gitignore
```

### Migration steps
1. Move `lang_helper.py` into `backend/`. Replace `st.secrets["GROQ_API_SECRET"]` with `os.environ["GROQ_API_KEY"]`. Keep function signatures unchanged so `api.py` imports them directly.
2. Build `backend/db.py` with SQLite helpers and an `init_db()` that creates the `reviews` table.
3. Build `backend/migrate_db.py` to read `db.json` once, insert rows into SQLite, then archive or delete the JSON.
4. Build `backend/api.py` with the 4 endpoints, including the SSE handler that wraps `review_code()`.
5. Delete `main.py` (Streamlit). Update `requirements.txt`: drop Streamlit, add `fastapi`, `uvicorn`, `sse-starlette`, `python-dotenv`.
6. Scaffold the Vite app under `frontend/`.
7. Update root `README.md` with the new dev workflow.

---

## 8. Deployment (informational, not in scope for first build)

- **Frontend:** static build (`npm run build`) deployed to Vercel/Netlify.
- **Backend:** uvicorn on Render/Railway/Fly.io. Required env: `GROQ_API_KEY`.
- **Single-origin option:** mount `frontend/dist` as static files inside FastAPI, deploy one container.

---

## 9. Open questions

None at design time. All major choices (architecture, scope, layout, stack, design tokens) confirmed in brainstorming.
