from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend import db

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


def review_code(code: str, language: str) -> str:
    from backend.lang_helper import review_code as _review_code
    return _review_code(code, language)


def generate_title(code: str) -> str:
    from backend.lang_helper import generate_title as _generate_title
    return _generate_title(code)


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
