"""Generate 3–5 major events and explanation questions from passage text via Groq (structured output)."""

import json
import os
from typing import Any

try:
    from litellm import completion
except ImportError:
    completion = None  # type: ignore

MODEL = "groq/openai/gpt-oss-120b"

SYSTEM_PROMPT = """You are helping with inductive Bible study. Given a scripture passage in simplified Chinese, output exactly 3 to 5 major story events (何事) as a JSON object.

Rules:
- Output ONLY valid JSON, no other text.
- Use this exact shape: {"events": [{"id": "e1", "label": "简短摘要"}, ...]}
- ids: "e1", "e2", "e3", ... (one per event, 3–5 total).
- label: one short sentence in simplified Chinese summarizing that major event. Do not quote the scripture; summarize in your own words.
- Choose the 3–5 most important plot beats (setting, key actions, climax, resolution). Do not list every verse."""

EXPLANATION_QUESTIONS_PROMPT = """You are helping with inductive Bible study. Given a scripture passage in simplified Chinese, output 3 to 6 explanation questions (解释性问题) as a JSON object. These questions help the group explain what is going on: motives (人物动机), cultural background (文化背景), and meaning (神学/经文意义).

Rules:
- Output ONLY valid JSON, no other text.
- Use this exact shape: {"questions": [{"id": "eq1", "text": "问题内容"}, ...]}
- ids: "eq1", "eq2", "eq3", ... (one per question, 3–6 total).
- text: one question in simplified Chinese. Questions should:
  - Be suitable for group discussion (not yes/no answers).
  - Go from simpler to deeper. Ask about motives in concrete ways (e.g. "可能在想什么" rather than vague "为什么").
  - Cover 为何 (why / motives) and 何意 (what does it mean). Include cultural background where relevant.
- Do not quote long scripture; refer to characters or events briefly."""


def _has_api_key() -> bool:
    return bool(os.environ.get("GROQ_API_KEY"))


def generate_major_events(passage_text: str, reference: str = "") -> list[dict[str, str]]:
    """
    Call Groq to get 3–5 major events from passage text.
    Returns list of {"id": "e1", "label": "..."}; empty list on error or missing key.
    """
    if completion is None:
        return []
    if not _has_api_key():
        return []

    user_content = f"Scripture reference: {reference}\n\nPassage text (simplified Chinese):\n{passage_text}"

    try:
        response = completion(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        raw = (response.choices[0].message.content or "").strip()
        if not raw:
            return []
        # Strip markdown code fence if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        data: Any = json.loads(raw)
        events = data.get("events")
        if not isinstance(events, list):
            return []
        out = []
        for i, item in enumerate(events[:10]):
            if not isinstance(item, dict):
                continue
            eid = item.get("id") or f"e{i+1}"
            if not isinstance(eid, str):
                eid = f"e{i+1}"
            label = item.get("label")
            if not isinstance(label, str) or not label.strip():
                continue
            out.append({"id": eid.strip(), "label": label.strip()})
        return out[:5]  # cap at 5
    except (json.JSONDecodeError, KeyError, IndexError, TypeError, Exception):
        return []


def generate_explanation_questions(passage_text: str, reference: str = "") -> list[dict[str, str]]:
    """
    Call Groq to get 3–6 explanation questions (解释性问题) for the passage.
    Returns list of {"id": "eq1", "text": "..."}; empty list on error or missing key.
    """
    if completion is None:
        return []
    if not _has_api_key():
        return []

    user_content = f"Scripture reference: {reference}\n\nPassage text (simplified Chinese):\n{passage_text}"

    try:
        response = completion(
            model=MODEL,
            messages=[
                {"role": "system", "content": EXPLANATION_QUESTIONS_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        raw = (response.choices[0].message.content or "").strip()
        if not raw:
            return []
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        data: Any = json.loads(raw)
        questions = data.get("questions")
        if not isinstance(questions, list):
            return []
        out = []
        for i, item in enumerate(questions[:10]):
            if not isinstance(item, dict):
                continue
            eid = item.get("id") or f"eq{i+1}"
            if not isinstance(eid, str):
                eid = f"eq{i+1}"
            text = item.get("text")
            if not isinstance(text, str) or not text.strip():
                continue
            out.append({"id": eid.strip(), "text": text.strip()})
        return out[:6]  # cap at 6
    except (json.JSONDecodeError, KeyError, IndexError, TypeError, Exception):
        return []
