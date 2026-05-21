# AI Code Reviewer — React + TypeScript UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Streamlit UI with a React + TypeScript frontend (Vite + Tailwind + shadcn/ui + Monaco) and migrate the Python LLM logic behind a FastAPI service with SQLite storage and streaming responses.

**Architecture:** Two services. FastAPI backend wraps the existing `lang_helper.py` and exposes 4 REST endpoints (one of which streams via SSE). React frontend talks to it via a Vite dev proxy. SQLite replaces `db.json`.

**Tech Stack:** Python 3.9+, FastAPI, uvicorn, sse-starlette, SQLite, LangChain (existing), Groq. React 18, TypeScript, Vite, Tailwind, shadcn/ui, Monaco Editor, React Query, Zustand, react-markdown, rehype-highlight, date-fns.

**Spec:** [`../specs/2026-05-20-react-ts-ui-design.md`](../specs/2026-05-20-react-ts-ui-design.md)

---

## Phase 1 — Backend (FastAPI + SQLite)

### Task B1: Move `lang_helper.py` into `backend/` and replace `st.secrets`

**Files:**
- Create: `backend/__init__.py` (empty)
- Move: `lang_helper.py` → `backend/lang_helper.py`
- Modify: top of `backend/lang_helper.py`

- [ ] **Step 1: Create the backend package**

```bash
mkdir -p backend/tests
touch backend/__init__.py backend/tests/__init__.py
```

- [ ] **Step 2: Move `lang_helper.py`**

```bash
git mv lang_helper.py backend/lang_helper.py
```

- [ ] **Step 3: Replace `st.secrets` with env var**

Open `backend/lang_helper.py`. Replace the top imports and `llm = ...` block with:

```python
import json
import os
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY environment variable is not set")

llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0,
    api_key=GROQ_API_KEY,
)
```

Also remove the `import streamlit as st` line entirely. Keep `generate_title` and `review_code` function bodies as they are EXCEPT remove the `db.json` read/write block at the bottom of `review_code` (the SQLite layer in `db.py` will handle persistence). The function should now end with just `return response.text`.

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "refactor: move lang_helper into backend package, drop streamlit secrets"
```

---

### Task B2: SQLite persistence layer

**Files:**
- Create: `backend/db.py`
- Create: `backend/tests/test_db.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_db.py`:

```python
import os
import tempfile
import pytest
from backend import db


@pytest.fixture
def tmp_db(monkeypatch):
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    monkeypatch.setattr(db, "DB_PATH", path)
    db.init_db()
    yield path
    os.unlink(path)


def test_insert_then_list(tmp_db):
    review_id = db.insert_review(
        title="Test", code="print(1)", language="Python", response="LGTM"
    )
    rows = db.list_reviews()
    assert len(rows) == 1
    assert rows[0]["id"] == review_id
    assert rows[0]["title"] == "Test"
    assert rows[0]["language"] == "Python"


def test_get_review(tmp_db):
    review_id = db.insert_review(
        title="T", code="x", language="Python", response="r"
    )
    row = db.get_review(review_id)
    assert row["code"] == "x"
    assert row["response"] == "r"


def test_get_review_missing(tmp_db):
    assert db.get_review(999) is None


def test_delete_review(tmp_db):
    review_id = db.insert_review(
        title="T", code="x", language="Python", response="r"
    )
    assert db.delete_review(review_id) is True
    assert db.get_review(review_id) is None
    assert db.delete_review(review_id) is False
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd backend && python -m pytest tests/test_db.py -v
```

Expected: ImportError or AttributeError — `db` module does not exist.

- [ ] **Step 3: Implement `db.py`**

Create `backend/db.py`:

```python
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = str(Path(__file__).parent / "reviews.db")


@contextmanager
def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with _conn() as c:
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                code TEXT NOT NULL,
                language TEXT NOT NULL,
                response TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def insert_review(*, title: str, code: str, language: str, response: str) -> int:
    created_at = datetime.now(timezone.utc).isoformat()
    with _conn() as c:
        cur = c.execute(
            "INSERT INTO reviews (title, code, language, response, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (title, code, language, response, created_at),
        )
        return cur.lastrowid


def list_reviews() -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            "SELECT id, title, language, created_at FROM reviews ORDER BY id DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def get_review(review_id: int) -> dict | None:
    with _conn() as c:
        row = c.execute(
            "SELECT id, title, code, language, response, created_at "
            "FROM reviews WHERE id = ?",
            (review_id,),
        ).fetchone()
        return dict(row) if row else None


def delete_review(review_id: int) -> bool:
    with _conn() as c:
        cur = c.execute("DELETE FROM reviews WHERE id = ?", (review_id,))
        return cur.rowcount > 0
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd backend && python -m pytest tests/test_db.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/db.py backend/tests/test_db.py
git commit -m "feat(backend): add SQLite persistence layer for reviews"
```

---

### Task B3: One-off `db.json` → SQLite migration script

**Files:**
- Create: `backend/migrate_db.py`

- [ ] **Step 1: Implement the script**

Create `backend/migrate_db.py`:

```python
"""One-off migration: read legacy db.json, write rows into SQLite, archive the JSON."""
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from backend import db


def main() -> int:
    legacy = Path(__file__).resolve().parent.parent / "db.json"
    if not legacy.exists():
        print(f"No legacy file at {legacy}, nothing to migrate.")
        db.init_db()
        return 0

    db.init_db()
    try:
        rows = json.loads(legacy.read_text() or "[]")
    except json.JSONDecodeError:
        print(f"{legacy} is not valid JSON; aborting.")
        return 1

    inserted = 0
    fallback_ts = datetime.now(timezone.utc).isoformat()
    for row in rows:
        db.insert_review(
            title=row.get("title", "Untitled"),
            code=row.get("code", ""),
            language=row.get("language", "Python"),
            response=row.get("response", ""),
        )
        inserted += 1

    archive = legacy.with_suffix(".json.bak")
    shutil.move(str(legacy), str(archive))
    print(f"Migrated {inserted} review(s). Legacy file archived to {archive}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Run the migration**

```bash
cd "$(git rev-parse --show-toplevel)" && python -m backend.migrate_db
```

Expected output: either "No legacy file..." or "Migrated N review(s)..." depending on whether `db.json` exists.

- [ ] **Step 3: Commit**

```bash
git add backend/migrate_db.py
[ -f db.json.bak ] && git add db.json.bak
[ -f db.json ] || git rm --cached db.json 2>/dev/null || true
git commit -m "feat(backend): migrate db.json into SQLite"
```

---

### Task B4: FastAPI app with non-streaming endpoints

**Files:**
- Create: `backend/api.py`
- Create: `backend/tests/test_api.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_api.py`:

```python
import os
import tempfile
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from backend import db


@pytest.fixture
def client(monkeypatch):
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    monkeypatch.setattr(db, "DB_PATH", path)
    db.init_db()
    with patch("backend.api.review_code", return_value="## Mock review\nLGTM"), \
         patch("backend.api.generate_title", return_value="Mock title"):
        from backend.api import app
        yield TestClient(app)
    os.unlink(path)


def test_list_empty(client):
    r = client.get("/api/reviews")
    assert r.status_code == 200
    assert r.json() == []


def test_create_and_list(client):
    r = client.post("/api/reviews", json={"code": "print(1)", "language": "Python"})
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "Mock title"
    assert body["response"] == "## Mock review\nLGTM"
    assert body["language"] == "Python"
    assert "id" in body and "created_at" in body

    r = client.get("/api/reviews")
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_create_rejects_empty_code(client):
    r = client.post("/api/reviews", json={"code": "   ", "language": "Python"})
    assert r.status_code == 422 or r.status_code == 400


def test_get_review(client):
    created = client.post(
        "/api/reviews", json={"code": "x=1", "language": "Python"}
    ).json()
    r = client.get(f"/api/reviews/{created['id']}")
    assert r.status_code == 200
    assert r.json()["code"] == "x=1"


def test_get_missing(client):
    r = client.get("/api/reviews/9999")
    assert r.status_code == 404


def test_delete(client):
    created = client.post(
        "/api/reviews", json={"code": "x=1", "language": "Python"}
    ).json()
    r = client.delete(f"/api/reviews/{created['id']}")
    assert r.status_code == 204
    assert client.get(f"/api/reviews/{created['id']}").status_code == 404
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd "$(git rev-parse --show-toplevel)" && python -m pytest backend/tests/test_api.py -v
```

Expected: ImportError on `backend.api`.

- [ ] **Step 3: Implement the non-streaming endpoints**

Create `backend/api.py`:

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend import db
from backend.lang_helper import generate_title, review_code

app = FastAPI(title="AI Code Reviewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


class ReviewRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = Field(..., min_length=1)


@app.post("/api/reviews")
def create_review(req: ReviewRequest) -> dict:
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="code is empty")
    response_text = review_code(req.code, req.language)
    title = generate_title(req.code)
    review_id = db.insert_review(
        title=title,
        code=req.code,
        language=req.language,
        response=response_text,
    )
    saved = db.get_review(review_id)
    return saved


@app.get("/api/reviews")
def list_reviews() -> list[dict]:
    return db.list_reviews()


@app.get("/api/reviews/{review_id}")
def get_review(review_id: int) -> dict:
    row = db.get_review(review_id)
    if row is None:
        raise HTTPException(status_code=404, detail="not found")
    return row


@app.delete("/api/reviews/{review_id}", status_code=204)
def delete_review(review_id: int) -> None:
    if not db.delete_review(review_id):
        raise HTTPException(status_code=404, detail="not found")
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd "$(git rev-parse --show-toplevel)" && python -m pytest backend/tests/test_api.py -v
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/api.py backend/tests/test_api.py
git commit -m "feat(backend): add FastAPI app with reviews CRUD endpoints"
```

---

### Task B5: SSE streaming on `POST /api/reviews`

**Files:**
- Modify: `backend/api.py`
- Modify: `backend/lang_helper.py` (add a streaming variant)

- [ ] **Step 1: Add `stream_review` to `lang_helper.py`**

Append to `backend/lang_helper.py`:

```python
def stream_review(code: str, language: str):
    """Yield review tokens as they arrive from Groq."""
    prompt = PromptTemplate(
        input_variables=["code", "language"],
        template="""
You are a senior software engineer.

Review the following {language} code and provide constructive feedback,
identify potential issues, suggest improvements, and highlight best practices.

Code:
{code}
""",
    )
    chain = prompt | llm
    for chunk in chain.stream({"code": code, "language": language}):
        token = getattr(chunk, "content", None) or getattr(chunk, "text", "")
        if token:
            yield token
```

- [ ] **Step 2: Replace the `create_review` route with a streaming SSE version**

In `backend/api.py`, add the import at the top:

```python
import json
from sse_starlette.sse import EventSourceResponse

from backend.lang_helper import generate_title, review_code, stream_review
```

Replace the existing `create_review` route with two routes — a streaming SSE route at `POST /api/reviews/stream`, and the existing non-streaming `POST /api/reviews` (kept so tests stay green and clients without SSE still work):

```python
@app.post("/api/reviews/stream")
def stream_review_endpoint(req: ReviewRequest):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="code is empty")

    def event_source():
        collected: list[str] = []
        try:
            for token in stream_review(req.code, req.language):
                collected.append(token)
                yield {"event": "token", "data": token}
        except Exception as exc:  # noqa: BLE001 — surface to client
            yield {"event": "error", "data": str(exc)}
            return

        full = "".join(collected)
        title = generate_title(req.code)
        review_id = db.insert_review(
            title=title,
            code=req.code,
            language=req.language,
            response=full,
        )
        saved = db.get_review(review_id)
        yield {"event": "done", "data": json.dumps(saved)}

    return EventSourceResponse(event_source())
```

Keep the existing non-streaming `POST /api/reviews` route exactly as-is.

- [ ] **Step 3: Smoke-test the stream by hand**

```bash
GROQ_API_KEY=your_key cd "$(git rev-parse --show-toplevel)" && uvicorn backend.api:app --reload &
sleep 2
curl -N -H "Accept: text/event-stream" -H "Content-Type: application/json" \
  -d '{"code":"def f():\n  return 1","language":"Python"}' \
  http://localhost:8000/api/reviews/stream
kill %1
```

Expected: a series of `event: token` lines followed by an `event: done` line carrying a JSON saved review.

- [ ] **Step 4: Re-run the test suite — non-streaming endpoints still pass**

```bash
cd "$(git rev-parse --show-toplevel)" && python -m pytest backend/tests/ -v
```

Expected: 10 passed (4 db + 6 api).

- [ ] **Step 5: Commit**

```bash
git add backend/api.py backend/lang_helper.py
git commit -m "feat(backend): add SSE streaming endpoint for review responses"
```

---

### Task B6: Backend `requirements.txt` + `.env.example` + run script

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Delete: top-level `requirements.txt` (will be re-purposed)

- [ ] **Step 1: Write `backend/requirements.txt`**

Create `backend/requirements.txt`:

```
fastapi>=0.110
uvicorn[standard]>=0.27
sse-starlette>=2.0
langchain-core>=0.2
langchain-groq>=0.1
python-dotenv>=1.0
pydantic>=2.6
pytest>=8.0
httpx>=0.27
```

- [ ] **Step 2: Write `backend/.env.example`**

Create `backend/.env.example`:

```
GROQ_API_KEY=your_groq_api_key_here
```

- [ ] **Step 3: Remove the legacy top-level `requirements.txt`**

```bash
git rm requirements.txt
```

- [ ] **Step 4: Verify a clean install works**

```bash
cd "$(git rev-parse --show-toplevel)" && python -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt && python -m pytest backend/tests/ -v && deactivate
```

Expected: install succeeds, 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/.env.example
git commit -m "chore(backend): split requirements, add env example, drop streamlit deps"
```

---

### Task B7: Delete Streamlit `main.py` and old `.env_sample`

**Files:**
- Delete: `main.py`
- Delete: `.env_sample`

- [ ] **Step 1: Remove obsolete files**

```bash
git rm main.py .env_sample
```

- [ ] **Step 2: Verify backend still runs**

```bash
cd "$(git rev-parse --show-toplevel)" && source .venv/bin/activate && python -m pytest backend/tests/ -v && deactivate
```

Expected: 10 passed.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove obsolete streamlit entry point"
```

---

## Phase 2 — Frontend scaffolding

### Task F1: Scaffold Vite + React + TS project

**Files:**
- Create: `frontend/` (entire directory)

- [ ] **Step 1: Scaffold via Vite**

```bash
cd "$(git rev-parse --show-toplevel)" && npm create vite@latest frontend -- --template react-ts
```

When prompted, accept defaults (React, TypeScript variant).

- [ ] **Step 2: Install base dependencies**

```bash
cd "$(git rev-parse --show-toplevel)/frontend" && npm install
```

- [ ] **Step 3: Verify the dev server boots**

```bash
cd "$(git rev-parse --show-toplevel)/frontend" && npm run dev &
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
kill %1
```

Expected: `200`.

- [ ] **Step 4: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/
git commit -m "chore(frontend): scaffold vite + react + ts project"
```

---

### Task F2: Install runtime dependencies

**Files:**
- Modify: `frontend/package.json` (via npm install)

- [ ] **Step 1: Install dependencies**

```bash
cd frontend && npm install \
  @monaco-editor/react \
  @tanstack/react-query \
  zustand \
  react-markdown \
  rehype-highlight \
  remark-gfm \
  date-fns \
  clsx \
  tailwind-merge \
  lucide-react \
  class-variance-authority
```

- [ ] **Step 2: Install dev dependencies**

```bash
cd frontend && npm install -D \
  tailwindcss postcss autoprefixer \
  @types/node \
  vitest @testing-library/react @testing-library/jest-dom jsdom \
  @playwright/test \
  msw
```

- [ ] **Step 3: Commit lockfile**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): install runtime and dev dependencies"
```

---

### Task F3: Tailwind + theme tokens

**Files:**
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Replace: `frontend/src/index.css` → `frontend/src/styles/globals.css`
- Modify: `frontend/src/main.tsx` (import path)

- [ ] **Step 1: Initialize Tailwind config**

```bash
cd frontend && npx tailwindcss init -p
```

This creates `tailwind.config.js` and `postcss.config.js`.

- [ ] **Step 2: Replace `tailwind.config.js` with TypeScript version**

Delete `tailwind.config.js` and create `frontend/tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        accent: "var(--accent)",
        "accent-glow": "var(--accent-glow)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      transitionTimingFunction: {
        "ease-out-quick": "cubic-bezier(0.25, 1, 0.5, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Move CSS and add tokens**

```bash
cd frontend && mkdir -p src/styles && git mv src/index.css src/styles/globals.css
```

Replace the contents of `frontend/src/styles/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");

:root {
  --bg: #ffffff;
  --surface: #f7f7f9;
  --surface-2: #eeeef2;
  --border: #e4e4ea;
  --text: #0b0b0f;
  --text-muted: #6b6b7b;
  --accent: #6342ff;
  --accent-glow: rgba(124, 92, 255, 0.35);
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
}

.dark {
  --bg: #0b0b0f;
  --surface: #13131a;
  --surface-2: #1b1b24;
  --border: #26262f;
  --text: #ececf1;
  --text-muted: #8a8a99;
  --accent: #7c5cff;
  --accent-glow: rgba(124, 92, 255, 0.35);
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
}

html,
body,
#root {
  height: 100%;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: theme("fontFamily.sans");
}

.review-glow {
  box-shadow: 0 0 0 0 var(--accent-glow);
  transition: box-shadow 200ms ease-out;
}
.review-glow:hover {
  box-shadow: 0 0 24px 4px var(--accent-glow);
}

.bg-radial-accent {
  background-image: radial-gradient(
    600px circle at 0% 0%,
    rgba(124, 92, 255, 0.06),
    transparent 60%
  );
}
```

- [ ] **Step 4: Update `main.tsx` import path**

Open `frontend/src/main.tsx` and change `import "./index.css"` to `import "./styles/globals.css"`. Also wrap `<App />` with the dark class on the root:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

document.documentElement.classList.add("dark");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Replace `App.tsx` with a sanity check**

Overwrite `frontend/src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="h-full bg-bg text-text flex items-center justify-center">
      <div className="font-mono text-2xl text-accent">tailwind ok</div>
    </div>
  );
}
```

- [ ] **Step 6: Verify**

```bash
cd frontend && npm run dev &
sleep 3
curl -s http://localhost:5173 | grep -q "<div id=\"root\""
kill %1
```

Expected: grep matches.

- [ ] **Step 7: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/
git commit -m "feat(frontend): tailwind config and dark theme tokens"
```

---

### Task F4: Vite proxy + path alias + env example

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tsconfig.json`, `frontend/tsconfig.app.json`
- Create: `frontend/.env.example`

- [ ] **Step 1: Configure Vite proxy and `@/` alias**

Replace `frontend/vite.config.ts` with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 2: Add `@/` alias to TypeScript**

In `frontend/tsconfig.app.json`, add to `compilerOptions`:

```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

- [ ] **Step 3: Create `.env.example`**

Create `frontend/.env.example`:

```
# Only needed in production builds where frontend and backend are on different origins.
# In dev, leave empty — Vite proxies /api to http://localhost:8000.
VITE_API_URL=
```

- [ ] **Step 4: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/
git commit -m "chore(frontend): vite proxy, @/ path alias, env example"
```

---

### Task F5: shadcn/ui primitives

**Files:**
- Create: `frontend/components.json`
- Create: `frontend/src/lib/cn.ts`
- Create: `frontend/src/components/ui/button.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `toast.tsx`, `toaster.tsx`, `dialog.tsx`, `input.tsx`

- [ ] **Step 1: Init shadcn**

```bash
cd frontend && npx shadcn@latest init -y
```

Accept defaults. Style: Default. Base color: Slate. CSS variables: yes.

- [ ] **Step 2: Add primitives we'll use**

```bash
cd frontend && npx shadcn@latest add button dropdown-menu tooltip dialog input -y
cd frontend && npx shadcn@latest add toast -y
```

- [ ] **Step 3: Create `cn` utility (shadcn places it in `src/lib/utils.ts`)**

Verify `frontend/src/lib/utils.ts` exists and exports `cn`. If shadcn used a different name, rename to match:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/
git commit -m "feat(frontend): install shadcn/ui primitives"
```

---

## Phase 3 — Data layer

### Task F6: Types and API client (`lib/api.ts`)

**Files:**
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1: Implement**

Create `frontend/src/lib/api.ts`:

```ts
const BASE = import.meta.env.VITE_API_URL ?? "";

export interface ReviewSummary {
  id: number;
  title: string;
  language: string;
  created_at: string;
}

export interface Review extends ReviewSummary {
  code: string;
  response: string;
}

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${input}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listReviews: () => jsonFetch<ReviewSummary[]>("/api/reviews"),
  getReview: (id: number) => jsonFetch<Review>(`/api/reviews/${id}`),
  deleteReview: (id: number) =>
    jsonFetch<void>(`/api/reviews/${id}`, { method: "DELETE" }),
};
```

- [ ] **Step 2: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/src/lib/api.ts
git commit -m "feat(frontend): typed api client for reviews CRUD"
```

---

### Task F7: SSE streaming hook (`useStreamingReview.ts`)

**Files:**
- Create: `frontend/src/hooks/useStreamingReview.ts`

- [ ] **Step 1: Implement**

Create `frontend/src/hooks/useStreamingReview.ts`:

```ts
import { useCallback, useRef, useState } from "react";
import type { Review } from "@/lib/api";

const BASE = import.meta.env.VITE_API_URL ?? "";

export type StreamState = "idle" | "streaming" | "done" | "error";

export function useStreamingReview() {
  const [text, setText] = useState("");
  const [state, setState] = useState<StreamState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Review | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (code: string, language: string) => {
      setText("");
      setError(null);
      setSaved(null);
      setState("streaming");

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch(`${BASE}/api/reviews/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ code, language }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          setError(`HTTP ${res.status}`);
          setState("error");
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let currentEvent = "token";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const data = line.slice(5).trim();
              if (currentEvent === "token") {
                setText((t) => t + data);
              } else if (currentEvent === "done") {
                try {
                  setSaved(JSON.parse(data));
                } catch {
                  // ignore malformed final frame
                }
              } else if (currentEvent === "error") {
                setError(data);
                setState("error");
                return;
              }
            }
          }
        }
        setState("done");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
        setState("error");
      }
    },
    []
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState("idle");
  }, []);

  return { text, state, error, saved, start, cancel };
}
```

- [ ] **Step 2: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/src/hooks/useStreamingReview.ts
git commit -m "feat(frontend): SSE consumer hook for streaming reviews"
```

---

### Task F8: React Query reviews hook (`useReviews.ts`) and provider wiring

**Files:**
- Create: `frontend/src/hooks/useReviews.ts`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Implement the hook**

Create `frontend/src/hooks/useReviews.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const reviewsKey = ["reviews"] as const;

export function useReviewsList() {
  return useQuery({ queryKey: reviewsKey, queryFn: api.listReviews });
}

export function useReview(id: number | null) {
  return useQuery({
    queryKey: ["review", id],
    queryFn: () => api.getReview(id as number),
    enabled: id !== null,
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteReview,
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewsKey }),
  });
}
```

- [ ] **Step 2: Wire QueryClientProvider in `main.tsx`**

Update `frontend/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles/globals.css";

document.documentElement.classList.add("dark");

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 3: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/src/hooks/useReviews.ts frontend/src/main.tsx
git commit -m "feat(frontend): react query hooks for reviews"
```

---

### Task F9: Zustand UI store (`store/ui.ts`)

**Files:**
- Create: `frontend/src/store/ui.ts`

- [ ] **Step 1: Implement**

Create `frontend/src/store/ui.ts`:

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  language: string;
  theme: "dark" | "light";
  currentReviewId: number | null;
  toggleSidebar: () => void;
  setLanguage: (l: string) => void;
  toggleTheme: () => void;
  setCurrentReview: (id: number | null) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      language: "Python",
      theme: "dark",
      currentReviewId: null,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setLanguage: (language) => set({ language }),
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === "dark" ? "light" : "dark";
          document.documentElement.classList.toggle("dark", next === "dark");
          return { theme: next };
        }),
      setCurrentReview: (currentReviewId) => set({ currentReviewId }),
    }),
    {
      name: "ai-code-reviewer-ui",
      partialize: (s) => ({
        sidebarOpen: s.sidebarOpen,
        language: s.language,
        theme: s.theme,
      }),
    }
  )
);
```

- [ ] **Step 2: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/src/store/ui.ts
git commit -m "feat(frontend): zustand store for ui state (sidebar, language, theme)"
```

---

### Task F10: Language list (`lib/languages.ts`) and date grouping (`lib/dates.ts`)

**Files:**
- Create: `frontend/src/lib/languages.ts`
- Create: `frontend/src/lib/dates.ts`
- Create: `frontend/src/lib/dates.test.ts`

- [ ] **Step 1: Implement languages**

Create `frontend/src/lib/languages.ts`:

```ts
export interface Language {
  label: string;
  monaco: string;       // monaco language id
  dotColor: string;     // tailwind utility for the colored dot
}

export const LANGUAGES: Language[] = [
  { label: "Python", monaco: "python", dotColor: "bg-yellow-400" },
  { label: "JavaScript", monaco: "javascript", dotColor: "bg-amber-400" },
  { label: "TypeScript", monaco: "typescript", dotColor: "bg-blue-400" },
  { label: "Django", monaco: "python", dotColor: "bg-green-500" },
];

export function getLanguage(label: string): Language {
  return LANGUAGES.find((l) => l.label === label) ?? LANGUAGES[0];
}
```

- [ ] **Step 2: Write failing tests for date grouping**

Create `frontend/src/lib/dates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { groupByDate } from "./dates";

const now = new Date("2026-05-20T10:00:00Z").toISOString();
const yesterday = new Date("2026-05-19T10:00:00Z").toISOString();
const last_week = new Date("2026-05-16T10:00:00Z").toISOString();
const older = new Date("2026-04-01T10:00:00Z").toISOString();

describe("groupByDate", () => {
  it("buckets reviews into Today, Yesterday, This week, Older", () => {
    const items = [
      { id: 1, created_at: now },
      { id: 2, created_at: yesterday },
      { id: 3, created_at: last_week },
      { id: 4, created_at: older },
    ];
    const out = groupByDate(items, new Date("2026-05-20T12:00:00Z"));
    expect(out.Today.map((x) => x.id)).toEqual([1]);
    expect(out.Yesterday.map((x) => x.id)).toEqual([2]);
    expect(out["This week"].map((x) => x.id)).toEqual([3]);
    expect(out.Older.map((x) => x.id)).toEqual([4]);
  });
});
```

- [ ] **Step 3: Add a `test` script and Vitest config**

In `frontend/package.json`, add to scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `frontend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "jsdom" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 4: Run tests — expect failure**

```bash
cd frontend && npm test -- dates
```

Expected: fail — `groupByDate` not exported.

- [ ] **Step 5: Implement `dates.ts`**

Create `frontend/src/lib/dates.ts`:

```ts
import { isToday, isYesterday, differenceInCalendarDays } from "date-fns";

export type Grouped<T> = {
  Today: T[];
  Yesterday: T[];
  "This week": T[];
  Older: T[];
};

export function groupByDate<T extends { created_at: string }>(
  items: T[],
  now: Date = new Date()
): Grouped<T> {
  const groups: Grouped<T> = { Today: [], Yesterday: [], "This week": [], Older: [] };
  for (const item of items) {
    const d = new Date(item.created_at);
    if (isToday(d) || differenceInCalendarDays(now, d) === 0) groups.Today.push(item);
    else if (isYesterday(d) || differenceInCalendarDays(now, d) === 1)
      groups.Yesterday.push(item);
    else if (differenceInCalendarDays(now, d) <= 7) groups["This week"].push(item);
    else groups.Older.push(item);
  }
  return groups;
}
```

- [ ] **Step 6: Run tests — expect pass**

```bash
cd frontend && npm test -- dates
```

Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/
git commit -m "feat(frontend): language list and date grouping helper"
```

---

## Phase 4 — Layout shell

### Task F11: App shell with three-pane layout

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/layout/TopBar.tsx`
- Create: `frontend/src/components/layout/HistorySidebar.tsx` (stub)
- Create: `frontend/src/components/layout/Workspace.tsx` (stub)

- [ ] **Step 1: Stubs for sidebar and workspace**

Create `frontend/src/components/layout/HistorySidebar.tsx`:

```tsx
import { useUI } from "@/store/ui";
import { cn } from "@/lib/utils";

export function HistorySidebar() {
  const open = useUI((s) => s.sidebarOpen);
  return (
    <aside
      className={cn(
        "h-full border-r border-border bg-surface transition-[width] duration-200",
        open ? "w-[280px]" : "w-[56px]"
      )}
    >
      <div className="p-4 text-text-muted text-sm">{open ? "History" : "≡"}</div>
    </aside>
  );
}
```

Create `frontend/src/components/layout/Workspace.tsx`:

```tsx
export function Workspace() {
  return (
    <main className="flex-1 grid grid-cols-2 gap-px bg-border">
      <section className="bg-bg p-6 bg-radial-accent">
        <div className="text-text-muted text-sm">Code editor placeholder</div>
      </section>
      <section className="bg-bg p-6">
        <div className="text-text-muted text-sm">Review panel placeholder</div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Implement `TopBar`**

Create `frontend/src/components/layout/TopBar.tsx`:

```tsx
import { Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useUI } from "@/store/ui";
import { LANGUAGES, getLanguage } from "@/lib/languages";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { language, setLanguage, theme, toggleTheme, toggleSidebar } = useUI();
  const current = getLanguage(language);

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <Menu className="w-4 h-4" />
      </Button>
      <div className="font-semibold tracking-tight">
        <span className="text-accent">▣</span> AI Code Reviewer
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <span className={cn("w-2 h-2 rounded-full", current.dotColor)} />
              {current.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LANGUAGES.map((l) => (
              <DropdownMenuItem key={l.label} onClick={() => setLanguage(l.label)}>
                <span className={cn("w-2 h-2 rounded-full mr-2", l.dotColor)} />
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Wire `App.tsx`**

Replace `frontend/src/App.tsx`:

```tsx
import { TopBar } from "@/components/layout/TopBar";
import { HistorySidebar } from "@/components/layout/HistorySidebar";
import { Workspace } from "@/components/layout/Workspace";

export default function App() {
  return (
    <div className="h-full flex flex-col bg-bg text-text">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <HistorySidebar />
        <Workspace />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Eyeball it in the browser**

```bash
cd frontend && npm run dev
```

Open http://localhost:5173. Expected: dark top bar with "AI Code Reviewer", language dropdown shows 4 languages with colored dots, theme toggle flips colors, sidebar toggle collapses width to 56px.

- [ ] **Step 5: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/
git commit -m "feat(frontend): app shell with topbar, sidebar stub, workspace stub"
```

---

## Phase 5 — Code editor

### Task F12: Monaco-backed code editor

**Files:**
- Create: `frontend/src/components/editor/CodeEditor.tsx`

- [ ] **Step 1: Implement**

Create `frontend/src/components/editor/CodeEditor.tsx`:

```tsx
import Editor, { type OnMount } from "@monaco-editor/react";
import { useRef, useEffect } from "react";
import { getLanguage } from "@/lib/languages";

interface Props {
  value: string;
  onChange: (v: string) => void;
  language: string;
  readOnly?: boolean;
  onSubmit?: () => void;
}

export function CodeEditor({ value, onChange, language, readOnly, onSubmit }: Props) {
  const ref = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoLang = getLanguage(language).monaco;

  const handleMount: OnMount = (editor, monaco) => {
    ref.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onSubmit?.();
    });
  };

  useEffect(() => {
    ref.current?.updateOptions({ readOnly: !!readOnly });
  }, [readOnly]);

  return (
    <div className="h-full w-full bg-surface-2 rounded-md overflow-hidden border border-border">
      <Editor
        height="100%"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        language={monacoLang}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontFamily: "JetBrains Mono",
          fontSize: 13,
          padding: { top: 12 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          renderLineHighlight: "none",
        }}
        onMount={handleMount}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/src/components/editor/CodeEditor.tsx
git commit -m "feat(frontend): monaco-backed code editor with cmd+enter submit"
```

---

### Task F13: Review button with loading state

**Files:**
- Create: `frontend/src/components/editor/ReviewButton.tsx`

- [ ] **Step 1: Implement**

Create `frontend/src/components/editor/ReviewButton.tsx`:

```tsx
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function ReviewButton({ loading, disabled, onClick }: Props) {
  return (
    <Button
      size="lg"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "review-glow bg-accent text-white hover:bg-accent/90 gap-2",
        "transition-all"
      )}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Reviewing...
        </>
      ) : (
        <>
          Review Code
          <ArrowRight className="w-4 h-4" />
          <kbd className="ml-2 text-xs opacity-70">⌘↵</kbd>
        </>
      )}
    </Button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/src/components/editor/ReviewButton.tsx
git commit -m "feat(frontend): review submit button with loading state and glow"
```

---

## Phase 6 — Review panel

### Task F14: Markdown renderer with code highlighting

**Files:**
- Create: `frontend/src/components/review/ReviewMarkdown.tsx`
- Modify: `frontend/src/styles/globals.css` (add highlight.js theme import)

- [ ] **Step 1: Add highlight.js theme to globals**

Append to `frontend/src/styles/globals.css`:

```css
@import "highlight.js/styles/github-dark.css";
```

Install:

```bash
cd frontend && npm install highlight.js
```

- [ ] **Step 2: Implement renderer**

Create `frontend/src/components/review/ReviewMarkdown.tsx`:

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface Props {
  text: string;
}

export function ReviewMarkdown({ text }: Props) {
  return (
    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            return (
              <code
                className={`${className ?? ""} font-mono text-[12.5px]`}
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/
git commit -m "feat(frontend): markdown renderer with code highlighting"
```

---

### Task F15: Review actions (copy)

**Files:**
- Create: `frontend/src/components/review/ReviewActions.tsx`

- [ ] **Step 1: Implement**

Create `frontend/src/components/review/ReviewActions.tsx`:

```tsx
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  text: string;
}

export function ReviewActions({ text }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/src/components/review/ReviewActions.tsx
git commit -m "feat(frontend): copy review action"
```

---

### Task F16: Review panel container

**Files:**
- Create: `frontend/src/components/review/ReviewPanel.tsx`
- Modify: `frontend/src/components/layout/Workspace.tsx`

- [ ] **Step 1: Implement `ReviewPanel`**

Create `frontend/src/components/review/ReviewPanel.tsx`:

```tsx
import { Sparkles } from "lucide-react";
import { ReviewMarkdown } from "./ReviewMarkdown";
import { ReviewActions } from "./ReviewActions";
import type { StreamState } from "@/hooks/useStreamingReview";

interface Props {
  text: string;
  state: StreamState;
  error: string | null;
}

export function ReviewPanel({ text, state, error }: Props) {
  if (state === "idle" && !text) return <EmptyState />;
  if (state === "streaming" && !text) return <Skeleton />;
  if (state === "error") return <ErrorState message={error ?? "Something went wrong"} />;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-accent" />
          AI Review
        </div>
        {state === "done" && <ReviewActions text={text} />}
      </div>
      <div className="flex-1 overflow-auto pr-2">
        <ReviewMarkdown text={text} />
        {state === "streaming" && (
          <span className="inline-block w-2 h-4 ml-1 bg-accent animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-text-muted">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <div className="text-sm">
          Paste code, hit <kbd className="px-1 py-0.5 rounded bg-surface-2">⌘</kbd>
          <kbd className="px-1 py-0.5 rounded bg-surface-2">↵</kbd>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 w-1/4 bg-surface-2 rounded" />
      <div className="h-3 w-full bg-surface-2 rounded" />
      <div className="h-3 w-5/6 bg-surface-2 rounded" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-sm text-danger border border-danger/30 bg-danger/10 rounded-md p-3">
      {message}
    </div>
  );
}
```

- [ ] **Step 2: Update `Workspace.tsx` to glue editor + review panel together**

Replace `frontend/src/components/layout/Workspace.tsx`:

```tsx
import { useState, useEffect } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { ReviewButton } from "@/components/editor/ReviewButton";
import { ReviewPanel } from "@/components/review/ReviewPanel";
import { useStreamingReview } from "@/hooks/useStreamingReview";
import { useUI } from "@/store/ui";
import { useReview } from "@/hooks/useReviews";
import { useQueryClient } from "@tanstack/react-query";
import { reviewsKey } from "@/hooks/useReviews";

export function Workspace() {
  const [code, setCode] = useState("");
  const { language, currentReviewId, setCurrentReview } = useUI();
  const { text, state, error, saved, start } = useStreamingReview();
  const { data: savedReview } = useReview(currentReviewId);
  const qc = useQueryClient();

  useEffect(() => {
    if (savedReview && currentReviewId !== null) {
      setCode(savedReview.code);
    }
  }, [savedReview, currentReviewId]);

  useEffect(() => {
    if (saved) {
      qc.invalidateQueries({ queryKey: reviewsKey });
      setCurrentReview(saved.id);
    }
  }, [saved, qc, setCurrentReview]);

  const submit = () => {
    if (!code.trim() || state === "streaming") return;
    setCurrentReview(null);
    start(code, language);
  };

  const showText = currentReviewId !== null && savedReview ? savedReview.response : text;

  return (
    <main className="flex-1 grid grid-cols-2 gap-px bg-border">
      <section className="bg-bg p-6 bg-radial-accent flex flex-col gap-3 min-w-0">
        <div className="text-sm text-text-muted">Code</div>
        <div className="flex-1 min-h-0">
          <CodeEditor
            value={code}
            onChange={setCode}
            language={language}
            readOnly={currentReviewId !== null}
            onSubmit={submit}
          />
        </div>
        <div>
          <ReviewButton
            loading={state === "streaming"}
            disabled={!code.trim() || currentReviewId !== null}
            onClick={submit}
          />
        </div>
      </section>
      <section className="bg-bg p-6 min-w-0">
        <ReviewPanel
          text={showText}
          state={currentReviewId !== null ? "done" : state}
          error={error}
        />
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Smoke-test end to end**

Make sure backend is running (`uvicorn backend.api:app --reload`). Then:

```bash
cd frontend && npm run dev
```

Paste a Python snippet, press ⌘↵, watch tokens stream into the right pane.

- [ ] **Step 4: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/
git commit -m "feat(frontend): wire editor + review panel with streaming review"
```

---

## Phase 7 — History sidebar

### Task F17: History item, group, and search components

**Files:**
- Create: `frontend/src/components/history/HistoryItem.tsx`
- Create: `frontend/src/components/history/HistoryGroup.tsx`
- Create: `frontend/src/components/history/HistorySearch.tsx`

- [ ] **Step 1: `HistoryItem`**

Create `frontend/src/components/history/HistoryItem.tsx`:

```tsx
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { getLanguage } from "@/lib/languages";
import type { ReviewSummary } from "@/lib/api";

interface Props {
  item: ReviewSummary;
  active: boolean;
  onClick: () => void;
}

export function HistoryItem({ item, active, onClick }: Props) {
  const lang = getLanguage(item.language);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2",
        "hover:bg-surface-2 transition-colors",
        active && "bg-surface-2"
      )}
    >
      <span className={cn("w-2 h-2 rounded-full shrink-0", lang.dotColor)} />
      <span className="flex-1 truncate" title={item.title}>
        {item.title}
      </span>
      <span className="text-xs text-text-muted shrink-0">
        {formatDistanceToNow(new Date(item.created_at), { addSuffix: false })}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: `HistoryGroup`**

Create `frontend/src/components/history/HistoryGroup.tsx`:

```tsx
import type { ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

export function HistoryGroup({ label, children }: Props) {
  return (
    <div className="mb-4">
      <div className="px-3 py-1 text-[11px] uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: `HistorySearch`**

Create `frontend/src/components/history/HistorySearch.tsx`:

```tsx
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function HistorySearch({ value, onChange }: Props) {
  return (
    <div className="relative px-3 mb-3">
      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search reviews..."
        className="pl-7 h-8 text-sm bg-surface-2 border-border"
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/src/components/history/
git commit -m "feat(frontend): history sidebar item, group, search components"
```

---

### Task F18: Full history sidebar with grouping, search, empty state

**Files:**
- Modify: `frontend/src/components/layout/HistorySidebar.tsx`

- [ ] **Step 1: Replace stub**

Replace `frontend/src/components/layout/HistorySidebar.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUI } from "@/store/ui";
import { useReviewsList, useDeleteReview } from "@/hooks/useReviews";
import { groupByDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { HistorySearch } from "@/components/history/HistorySearch";
import { HistoryGroup } from "@/components/history/HistoryGroup";
import { HistoryItem } from "@/components/history/HistoryItem";

export function HistorySidebar() {
  const open = useUI((s) => s.sidebarOpen);
  const { currentReviewId, setCurrentReview } = useUI();
  const { data: reviews = [], isLoading } = useReviewsList();
  const del = useDeleteReview();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      search.trim()
        ? reviews.filter((r) =>
            r.title.toLowerCase().includes(search.toLowerCase())
          )
        : reviews,
    [reviews, search]
  );

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  if (!open) {
    return (
      <aside className="h-full w-[56px] border-r border-border bg-surface flex flex-col items-center py-3 gap-2">
        <Button variant="ghost" size="icon" aria-label="New review" onClick={() => setCurrentReview(null)}>
          <Plus className="w-4 h-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="h-full w-[280px] border-r border-border bg-surface flex flex-col">
      <div className="p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setCurrentReview(null)}
        >
          <Plus className="w-4 h-4" /> New review
        </Button>
      </div>
      <HistorySearch value={search} onChange={setSearch} />
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading && <div className="px-3 text-xs text-text-muted">Loading...</div>}
        {!isLoading && reviews.length === 0 && (
          <div className="px-3 text-xs text-text-muted">No reviews yet.</div>
        )}
        {(Object.keys(groups) as Array<keyof typeof groups>).map((label) =>
          groups[label].length > 0 ? (
            <HistoryGroup key={label} label={label}>
              {groups[label].map((item) => (
                <div key={item.id} className="group relative">
                  <HistoryItem
                    item={item}
                    active={item.id === currentReviewId}
                    onClick={() => setCurrentReview(item.id)}
                  />
                  <button
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded",
                      "opacity-0 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
                    )}
                    aria-label="Delete review"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${item.title}"?`)) {
                        del.mutate(item.id);
                        if (item.id === currentReviewId) setCurrentReview(null);
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </HistoryGroup>
          ) : null
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Manual smoke test**

With backend running and a couple of seeded reviews (run one review, then another), expect: sidebar lists them under "Today", clicking loads the review read-only in the editor and shows its response, delete button appears on hover and removes the row after confirm.

- [ ] **Step 3: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/src/components/layout/HistorySidebar.tsx
git commit -m "feat(frontend): full history sidebar with grouping, search, delete"
```

---

## Phase 8 — Polish & resilience

### Task F19: Toast system + error handling

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Workspace.tsx`

- [ ] **Step 1: Mount the shadcn `<Toaster />`**

In `frontend/src/App.tsx`:

```tsx
import { TopBar } from "@/components/layout/TopBar";
import { HistorySidebar } from "@/components/layout/HistorySidebar";
import { Workspace } from "@/components/layout/Workspace";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  return (
    <div className="h-full flex flex-col bg-bg text-text">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <HistorySidebar />
        <Workspace />
      </div>
      <Toaster />
    </div>
  );
}
```

- [ ] **Step 2: Toast on success and on error in `Workspace.tsx`**

Add to imports:

```tsx
import { useToast } from "@/components/ui/use-toast";
```

Inside `Workspace`:

```tsx
const { toast } = useToast();

useEffect(() => {
  if (state === "error" && error) {
    toast({
      title: "Couldn't review code",
      description: error,
      variant: "destructive",
    });
  }
}, [state, error, toast]);

useEffect(() => {
  if (saved) {
    toast({ title: "Review saved", description: saved.title });
  }
}, [saved, toast]);
```

- [ ] **Step 3: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/
git commit -m "feat(frontend): toasts for review success and error"
```

---

### Task F20: Global keyboard shortcuts

**Files:**
- Create: `frontend/src/hooks/useShortcuts.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Implement the hook**

Create `frontend/src/hooks/useShortcuts.ts`:

```ts
import { useEffect } from "react";
import { useUI } from "@/store/ui";

export function useShortcuts() {
  const { toggleSidebar } = useUI();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(
          'input[placeholder="Search reviews..."]'
        );
        el?.focus();
      }
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement | null)?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);
}
```

- [ ] **Step 2: Wire it in `App.tsx`**

```tsx
import { useShortcuts } from "@/hooks/useShortcuts";

export default function App() {
  useShortcuts();
  // ... rest as before
}
```

(⌘↵ is already handled inside Monaco.)

- [ ] **Step 3: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/
git commit -m "feat(frontend): global keyboard shortcuts (cmd+b, cmd+k, esc)"
```

---

### Task F21: Responsive stacked layout below 1024px

**Files:**
- Modify: `frontend/src/components/layout/Workspace.tsx`

- [ ] **Step 1: Use Tailwind responsive utility**

In `Workspace.tsx`, change the grid classes:

Replace:
```tsx
<main className="flex-1 grid grid-cols-2 gap-px bg-border">
```
with:
```tsx
<main className="flex-1 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 lg:grid-rows-1 gap-px bg-border">
```

- [ ] **Step 2: Manual check**

Resize the browser below 1024px wide. Editor should be on top, review panel below.

- [ ] **Step 3: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/src/components/layout/Workspace.tsx
git commit -m "feat(frontend): stack workspace panes vertically below lg breakpoint"
```

---

### Task F22: Spec-level UX polish (edit-a-copy, shake, ⌘L, retry banners)

**Files:**
- Modify: `frontend/src/hooks/useStreamingReview.ts`
- Modify: `frontend/src/hooks/useShortcuts.ts`
- Modify: `frontend/src/components/layout/Workspace.tsx`
- Modify: `frontend/src/components/review/ReviewPanel.tsx`
- Modify: `frontend/src/styles/globals.css`

- [ ] **Step 1: Add a shake utility class**

Append to `frontend/src/styles/globals.css`:

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}
.shake {
  animation: shake 0.32s ease-in-out;
}
```

- [ ] **Step 2: Trigger shake on empty submit and add an "Edit a copy" button**

In `frontend/src/components/layout/Workspace.tsx`, change the editor wrapper to support a shake class:

```tsx
const [shake, setShake] = useState(false);

const submit = () => {
  if (!code.trim()) {
    setShake(true);
    setTimeout(() => setShake(false), 320);
    return;
  }
  if (state === "streaming" || currentReviewId !== null) return;
  setCurrentReview(null);
  start(code, language);
};

const editACopy = () => {
  setCurrentReview(null);
};
```

Apply the class to the editor wrapper:

```tsx
<div className={cn("flex-1 min-h-0", shake && "shake")}>
  <CodeEditor ... />
</div>
```

Add the "Edit a copy" button just above the editor when `currentReviewId !== null`:

```tsx
{currentReviewId !== null && (
  <div className="flex items-center gap-2 text-sm text-text-muted">
    <span>Read-only — viewing saved review.</span>
    <Button variant="ghost" size="sm" onClick={editACopy} className="gap-1">
      <RotateCcw className="w-3 h-3" /> Edit a copy
    </Button>
  </div>
)}
```

Add imports at the top of the file:

```tsx
import { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
```

- [ ] **Step 3: Add ⌘L shortcut to open the language menu**

In `frontend/src/hooks/useShortcuts.ts`, extend the handler:

```ts
if (meta && e.key.toLowerCase() === "l") {
  e.preventDefault();
  const trigger = document.querySelector<HTMLButtonElement>(
    'button[data-slot="dropdown-menu-trigger"]'
  );
  trigger?.click();
}
```

(If the shadcn dropdown trigger doesn't carry `data-slot`, instead add `data-shortcut="language"` to the TopBar dropdown trigger and select by that attribute.)

- [ ] **Step 4: Add retry-on-429 with exponential backoff to `useStreamingReview.ts`**

Replace the body of `start` with a retry-wrapped version:

```ts
const start = useCallback(async (code: string, language: string) => {
  setText("");
  setError(null);
  setSaved(null);
  setState("streaming");

  const ctrl = new AbortController();
  abortRef.current = ctrl;

  const attempt = async (n: number): Promise<Response> => {
    const res = await fetch(`${BASE}/api/reviews/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ code, language }),
      signal: ctrl.signal,
    });
    if (res.status === 429 && n < 2) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, n)));
      return attempt(n + 1);
    }
    return res;
  };

  try {
    const res = await attempt(0);
    if (!res.ok || !res.body) {
      setError(`HTTP ${res.status}`);
      setState("error");
      return;
    }
    // ... rest of the existing reader loop unchanged ...
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    setError((err as Error).message);
    setState("error");
  }
}, []);
```

- [ ] **Step 5: Add "Connection lost — Retry?" banner on partial stream**

The hook already exposes `state`, `text`, and `error`. The retry trigger is just re-calling `start()` with the same code/language. In `ReviewPanel.tsx`, replace the `ErrorState` usage with a smarter banner that shows partial text plus a retry button when `text` is non-empty:

```tsx
interface Props {
  text: string;
  state: StreamState;
  error: string | null;
  onRetry?: () => void;
}

export function ReviewPanel({ text, state, error, onRetry }: Props) {
  if (state === "idle" && !text) return <EmptyState />;
  if (state === "streaming" && !text) return <Skeleton />;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-accent" />
          AI Review
        </div>
        {state === "done" && <ReviewActions text={text} />}
      </div>
      <div className="flex-1 overflow-auto pr-2">
        <ReviewMarkdown text={text} />
        {state === "streaming" && (
          <span className="inline-block w-2 h-4 ml-1 bg-accent animate-pulse align-middle" />
        )}
        {state === "error" && (
          <div className="mt-4 text-sm text-danger border border-danger/30 bg-danger/10 rounded-md p-3 flex items-center justify-between gap-3">
            <span>{error ?? "Connection lost."}</span>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

Add `import { Button } from "@/components/ui/button"` to the top.

- [ ] **Step 6: Pass `onRetry` from `Workspace.tsx`**

In `Workspace.tsx`, change the `ReviewPanel` invocation:

```tsx
<ReviewPanel
  text={showText}
  state={currentReviewId !== null ? "done" : state}
  error={error}
  onRetry={() => start(code, language)}
/>
```

- [ ] **Step 7: Manual verification**

- Submit with empty editor → editor box shakes briefly, no request sent.
- View a saved review → "Read-only — viewing saved review. [Edit a copy]" appears above the editor; clicking it clears `currentReviewId` and unlocks editing.
- Press ⌘L → language dropdown opens.
- Stop the backend mid-stream → "Connection lost" banner appears with Retry button; clicking restarts the stream.

- [ ] **Step 8: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/
git commit -m "feat(frontend): spec polish — shake, edit-a-copy, cmd+l, retry, 429 backoff"
```

---

## Phase 9 — Testing & cleanup

### Task T1: Playwright E2E smoke test with MSW

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/tests/e2e.spec.ts`
- Create: `frontend/src/mocks/handlers.ts`
- Create: `frontend/src/mocks/browser.ts`
- Modify: `frontend/src/main.tsx` (conditionally load MSW)

- [ ] **Step 1: Playwright config**

Create `frontend/playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: { baseURL: "http://localhost:5173" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: MSW handlers**

```bash
cd frontend && npx msw init public/
```

Create `frontend/src/mocks/handlers.ts`:

```ts
import { http, HttpResponse } from "msw";

let reviews: Array<{
  id: number;
  title: string;
  language: string;
  code: string;
  response: string;
  created_at: string;
}> = [];
let nextId = 1;

export const handlers = [
  http.get("/api/reviews", () =>
    HttpResponse.json(
      reviews.map(({ code: _c, response: _r, ...rest }) => rest)
    )
  ),
  http.post("/api/reviews/stream", async ({ request }) => {
    const body = (await request.json()) as { code: string; language: string };
    const stream = new ReadableStream({
      async start(ctrl) {
        const enc = new TextEncoder();
        for (const tok of ["## ", "Mock ", "review\n", "Looks ", "good."]) {
          ctrl.enqueue(enc.encode(`event: token\ndata: ${tok}\n\n`));
          await new Promise((r) => setTimeout(r, 40));
        }
        const saved = {
          id: nextId++,
          title: "Mock title",
          language: body.language,
          code: body.code,
          response: "## Mock review\nLooks good.",
          created_at: new Date().toISOString(),
        };
        reviews.unshift(saved);
        ctrl.enqueue(enc.encode(`event: done\ndata: ${JSON.stringify(saved)}\n\n`));
        ctrl.close();
      },
    });
    return new HttpResponse(stream, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }),
];
```

Create `frontend/src/mocks/browser.ts`:

```ts
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
export const worker = setupWorker(...handlers);
```

- [ ] **Step 3: Conditionally start MSW in `main.tsx`**

At the top of `frontend/src/main.tsx`, before render:

```tsx
async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCKS !== "1") return;
  const { worker } = await import("./mocks/browser");
  return worker.start({ onUnhandledRequest: "bypass" });
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
});
```

- [ ] **Step 4: Write the E2E test**

Create `frontend/tests/e2e.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("user can submit code and see streamed review saved to history", async ({ page }) => {
  await page.goto("/?VITE_USE_MOCKS=1");
  // Note: MSW is enabled via env. For Playwright we set VITE_USE_MOCKS=1 in npm script.
  await page.locator(".monaco-editor").click();
  await page.keyboard.type("print('hello')");
  await page.getByRole("button", { name: /Review Code/i }).click();
  await expect(page.getByText("Mock review")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Mock title")).toBeVisible();
});
```

- [ ] **Step 5: Add Playwright script with mocks enabled**

In `frontend/package.json` add:

```json
"test:e2e": "VITE_USE_MOCKS=1 playwright test"
```

Install Playwright browsers:

```bash
cd frontend && npx playwright install --with-deps chromium
```

- [ ] **Step 6: Run**

```bash
cd frontend && npm run test:e2e
```

Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add frontend/
git commit -m "test(frontend): playwright e2e smoke covering review flow"
```

---

### Task T2: Update root README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README content**

Overwrite the root-level `README.md` with the new dev workflow. Keep the original project description but replace install/run sections:

```markdown
# 🧠 AI Code Reviewer

An AI-powered code reviewer with a React + TypeScript frontend and a FastAPI backend wrapping LangChain + Groq LLaMA 3.1.

## Architecture

- `backend/` — FastAPI service. Exposes 4 REST endpoints; one streams via SSE.
- `frontend/` — React 18 + Vite + Tailwind + shadcn/ui + Monaco Editor.

## Run locally

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in GROQ_API_KEY
uvicorn api:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to FastAPI on port 8000.

## Tests

```bash
# backend
python -m pytest backend/tests/

# frontend unit
cd frontend && npm test

# frontend e2e
cd frontend && npm run test:e2e
```

## License

MIT.
```

- [ ] **Step 2: Commit**

```bash
cd "$(git rev-parse --show-toplevel)" && git add README.md
git commit -m "docs: update readme with new dev workflow for react + fastapi"
```

---

### Task T3: Final verification

- [ ] **Step 1: Run backend tests**

```bash
cd "$(git rev-parse --show-toplevel)" && python -m pytest backend/tests/ -v
```

Expected: 10 passed.

- [ ] **Step 2: Run frontend unit tests**

```bash
cd frontend && npm test
```

Expected: all green.

- [ ] **Step 3: Run E2E**

```bash
cd frontend && npm run test:e2e
```

Expected: 1 passed.

- [ ] **Step 4: Smoke test the live app**

In two terminals:
```bash
# terminal 1
cd backend && source .venv/bin/activate && uvicorn api:app --reload

# terminal 2
cd frontend && npm run dev
```

Open http://localhost:5173. Paste a small Python snippet, hit ⌘↵, watch tokens stream, see the entry land in the sidebar.

- [ ] **Step 5: Final commit if anything outstanding**

```bash
cd "$(git rev-parse --show-toplevel)" && git status
```

If clean, you're done. Otherwise commit remaining tweaks with a meaningful message.
