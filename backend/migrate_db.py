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
