"""FastAPI app for Socratic coach — standalone throwaway."""

import json
import base64
from pathlib import Path

from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from .passages import PASSAGE, get_passage_verses
from .prompts import SOCRATIC_SYSTEM_PROMPT, FIRST_QUESTION_ZH_SIMPLIFIED, get_coach_language_instruction
from .llm import socratic_reply
from .verse_parser import parse_verse_ranges

app = FastAPI(title="Socratic Coach", description="AI-led Socratic dialogue for Bible study prep")
_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))


def _decode_messages(value: str) -> list[dict[str, str]]:
    """Decode conversation history from form (base64 JSON)."""
    if not value:
        return []
    try:
        raw = base64.b64decode(value).decode("utf-8")
        return json.loads(raw)
    except Exception:
        return []


def _encode_messages(messages: list[dict[str, str]]) -> str:
    """Encode conversation history for form (base64 JSON)."""
    return base64.b64encode(json.dumps(messages).encode("utf-8")).decode("ascii")


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    """Landing: passage (three versions) + first AI message + form."""
    # Default tab is 简体, so show first question in Simplified Chinese to match
    messages = [{"role": "assistant", "content": FIRST_QUESTION_ZH_SIMPLIFIED}]
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "passage": PASSAGE,
            "passage_verses": get_passage_verses(PASSAGE),
            "messages": messages,
            "messages_encoded": _encode_messages(messages),
        },
    )


@app.post("/reply", response_class=HTMLResponse)
def reply(
    request: Request,
    user_message: str = Form(..., alias="user_message"),
    messages_encoded: str = Form("", alias="messages_encoded"),
    coach_lang: str = Form("simplified", alias="coach_lang"),
):
    """Append user message, call LLM, return HTMX fragment with AI reply + form."""
    messages = _decode_messages(messages_encoded)
    messages.append({"role": "user", "content": user_message.strip()})

    lang = (coach_lang or "").strip().lower()
    if lang not in ("simplified", "traditional", "niv"):
        lang = "simplified"
    language_instruction = get_coach_language_instruction(coach_lang)
    passage_verses = get_passage_verses(PASSAGE)[lang]
    passage_blurb = "\n".join(f'{v["n"]} {v["text"]}' for v in passage_verses)
    passage_context = (
        "\n\nPassage text (Luke 7:36-50; cite verse numbers only from this list):\n"
        + passage_blurb
    )
    effective_prompt = (
        SOCRATIC_SYSTEM_PROMPT + "\n\n" + language_instruction + passage_context
    )
    reply_text = socratic_reply(messages, effective_prompt)
    messages.append({"role": "assistant", "content": reply_text})

    highlight_verses = parse_verse_ranges(reply_text)
    # Render partial to string so we can return HTMLResponse with HX-Trigger header
    # (TemplateResponse does not reliably allow mutating headers in all Starlette versions)
    template = templates.env.get_template("partials/thread_and_form.html")
    body = template.render(
        request=request,
        messages=messages,
        messages_encoded=_encode_messages(messages),
    )
    return HTMLResponse(
        content=body,
        headers={"HX-Trigger": json.dumps({"highlightVerses": highlight_verses})},
    )
