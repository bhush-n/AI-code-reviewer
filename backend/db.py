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
