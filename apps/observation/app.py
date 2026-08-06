"""FastAPI app for Guided Scripture Observation — who/when/where + annotations."""

import json
import traceback
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse

from .entities import build_verse_segments
from .llm import generate_explanation_questions, generate_major_events
from .passages import PASSAGE, get_passage_verses

app = FastAPI(
    title="Guided Scripture Observation",
    description="Observation-phase UI: who/when/where highlighting and annotations for inductive Bible study.",
)
_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))


@app.get("/api/events")
def api_events():
    """Return 3–5 major events for the current passage (AI-generated via Groq)."""
    verses = get_passage_verses(PASSAGE)
    passage_text = "\n".join(f'{v["n"]} {v["text"]}' for v in verses)
    reference = PASSAGE.get("reference_zh", "") + " / " + PASSAGE.get("reference_en", "")
    events = generate_major_events(passage_text, reference)
    return JSONResponse(content=events)


@app.get("/api/explanation-questions")
def api_explanation_questions():
    """Return 3–6 suggested explanation questions for the current passage (AI-generated via Groq)."""
    verses = get_passage_verses(PASSAGE)
    passage_text = "\n".join(f'{v["n"]} {v["text"]}' for v in verses)
    reference = PASSAGE.get("reference_zh", "") + " / " + PASSAGE.get("reference_en", "")
    questions = generate_explanation_questions(passage_text, reference)
    return JSONResponse(content=questions)


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    """Observation UI: scripture left (simplified), who/when/where toggles + observations right."""
    try:
        verses = get_passage_verses(PASSAGE)
        verse_segments_list = build_verse_segments(PASSAGE)
        # Pair verse number with segments for template
        verse_rows = [
            {"verse_n": v["n"], "segments": verse_segments_list[i]}
            for i, v in enumerate(verses)
        ]
        passage_ref = "luke_7_36_50"  # for localStorage key
        # Event cards are loaded client-side from /api/events (AI-generated 3–5 major events)
        event_cards_json = json.dumps([], ensure_ascii=False)
        # Render template to string so any Jinja2 error is caught here
        template = templates.env.get_template("index.html")
        html_str = template.render(
            request=request,
            passage=PASSAGE,
            verse_rows=verse_rows,
            passage_ref=passage_ref,
            event_cards_json=event_cards_json,
        )
        return HTMLResponse(html_str)
    except Exception:
        return PlainTextResponse(
            traceback.format_exc(),
            status_code=500,
            media_type="text/plain; charset=utf-8",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5008)
