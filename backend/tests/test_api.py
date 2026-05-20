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
