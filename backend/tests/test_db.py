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
