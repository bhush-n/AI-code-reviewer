# 🧠 AI Code Reviewer

An AI-powered code review app. Paste code, pick a language, get instant feedback on bugs, performance, best practices, and security — backed by LangChain + Groq LLaMA 3.1.

The original Streamlit prototype lives at https://ai-code-reviewer-lang-groq.streamlit.app/. This repository now hosts a **React + TypeScript** frontend and a **FastAPI** backend.

---

## Architecture

```
AI-code-reviewer/
├── backend/                  # FastAPI service — wraps LangChain + Groq
│   ├── api.py                # 4 endpoints (POST/GET/GET/DELETE /api/reviews)
│   ├── lang_helper.py        # LLM prompts and chains
│   ├── db.py                 # SQLite persistence
│   ├── migrate_db.py         # one-off db.json → SQLite migration
│   ├── requirements.txt
│   └── tests/                # 10 pytest tests
└── frontend/                 # Vite + React 18 + TypeScript
    ├── src/
    │   ├── components/       # layout, editor, review, history, ui (shadcn)
    │   ├── hooks/            # React Query hooks + keyboard shortcuts
    │   ├── store/            # Zustand (sidebar/language/theme)
    │   ├── lib/              # api client, date grouping, language list
    │   └── styles/           # Tailwind + dark theme tokens
    └── package.json
```

## Features

- Monaco code editor with language-aware syntax highlighting (⌘↵ to submit)
- Dark-first UI styled with Tailwind + shadcn/ui (Vercel/Linear vibe)
- Saved review history grouped by Today / Yesterday / This week / Older
- Client-side search across saved review titles
- Read-only view of past reviews + "Edit a copy" to start a fresh one from the same code
- Sonner toasts on success and error
- Global keyboard shortcuts: `⌘B` toggle sidebar, `⌘K` focus search, `⌘L` open language menu, `Esc` blur

## Tech stack

**Backend:** Python 3.9+, FastAPI, uvicorn, LangChain Core, LangChain Groq, SQLite, pytest.
**Frontend:** Vite, React 18, TypeScript, Tailwind v3, shadcn/ui, Monaco Editor, TanStack Query, Zustand, react-markdown, rehype-highlight, sonner, date-fns, lucide-react.

---

## Run locally

You need a Groq API key (free at https://console.groq.com/).

### Backend (port 8000)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate    # or: python3 -m venv .venv
pip install -r requirements.txt
cp .env.example .env                                  # then edit GROQ_API_KEY
export GROQ_API_KEY=your_key_here
uvicorn api:app --reload --port 8000
```

If you have an old `db.json` from the Streamlit prototype, copy it to the repo root and run the one-off migration before starting the API:

```bash
python -m backend.migrate_db
```

### Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to `http://localhost:8000`, so no CORS configuration is needed in dev.

---

## Tests

```bash
# backend — 10 tests (4 db, 6 api with mocked LLM)
source backend/.venv/bin/activate
python -m pytest backend/tests/ -v

# frontend — 1 unit test (date grouping)
cd frontend && npm test
```

---

## How it works

1. User pastes code into the Monaco editor and picks a language (Python, JavaScript, TypeScript, or Django).
2. Frontend POSTs `{ code, language }` to `/api/reviews`.
3. FastAPI calls `lang_helper.review_code()` which composes a LangChain prompt and queries Groq's LLaMA 3.1 8B instant model.
4. The response is saved to SQLite with a short AI-generated title.
5. The new review appears in the history sidebar; clicking it loads the code (read-only) and the saved AI feedback.

---

## License

MIT.

## Author

**Bhushan Chaudhari** — Software Engineer | Python | Django | Backend | GenAI

⭐ If you like this project, don't forget to star the repository!
