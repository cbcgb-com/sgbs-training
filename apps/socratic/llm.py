"""Thin wrapper around LiteLLM for Socratic coach responses."""

import os
from typing import List, Dict, Any

try:
    from litellm import completion
except ImportError:
    completion = None  # type: ignore


def _has_api_key() -> bool:
    """True if GROQ_API_KEY is set (used for groq/gpt-oss-120b)."""
    return bool(os.environ.get("GROQ_API_KEY"))


def socratic_reply(
    messages: List[Dict[str, str]],
    system_prompt: str,
    model: str = "groq/openai/gpt-oss-120b",
) -> str:
    """
    Call the LLM with conversation history and system prompt via LiteLLM.
    Returns the assistant's reply (next question or hint only).
    Uses Groq gpt-oss-120b by default; set GROQ_API_KEY.
    """
    if completion is None:
        return "LiteLLM is not installed. Install with: pip install litellm"
    if not _has_api_key():
        return "No API key set. Set GROQ_API_KEY to use the coach."

    full_messages: List[Dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        *messages,
    ]

    response = completion(
        model=model,
        messages=full_messages,
        temperature=0.7,
    )
    content = response.choices[0].message.content
    return (content or "").strip()
