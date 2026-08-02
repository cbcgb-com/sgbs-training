#!/usr/bin/env python3
"""Extract .content-quiz blocks from lesson-2 into docs/quizzes/lesson-2/*.html."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NARRATIVE = ROOT / "docs/class-notes/lesson-2-narrative.md"
QUIZ_DIR = ROOT / "docs/quizzes/lesson-2"

QUIZZES = [
    (
        "content-quiz-lesson-2-reflect",
        "reflect.html",
        "課前思考題",
    ),
    (
        "content-quiz-lesson-2-elements-mini",
        "elements-mini.html",
        "三要素小練習",
    ),
    (
        "content-quiz-lesson-2-message-steps-demo",
        "message-steps-demo.html",
        "示範段三步檢核小練習",
    ),
    (
        "content-quiz-lesson-2-message-steps-practice",
        "message-steps-practice.html",
        "路加福音半自主三步練習",
    ),
    (
        "content-quiz-lesson-2-review",
        "review.html",
        "預讀複習題",
    ),
]

IFRAME_SRC = "../../quizzes/lesson-2/{filename}"


def extract_quiz_div(text: str, quiz_id: str) -> str:
    marker = f'id="{quiz_id}"'
    pos = text.index(marker)
    start = text.rfind("<div", 0, pos)
    if start < 0:
        raise ValueError(f"no opening div for {quiz_id}")

    depth = 0
    i = start
    n = len(text)
    while i < n:
        if text.startswith("<div", i):
            depth += 1
            gt = text.find(">", i)
            if gt < 0:
                raise ValueError("unclosed div tag")
            i = gt + 1
        elif text.startswith("</div>", i):
            depth -= 1
            end = i + len("</div>")
            i = end
            if depth == 0:
                return text[start:end]
        else:
            i += 1
    raise ValueError(f"unbalanced div for {quiz_id}")


def wrap_quiz_page(quiz_html: str, title: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="zh-Hant" class="content-quiz-embed-root">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <link rel="stylesheet" href="../../stylesheets/extra.css">
  <link rel="stylesheet" href="../../stylesheets/content-quiz-embed.css">
</head>
<body class="content-quiz-embed">
{quiz_html}
  <script src="../../javascripts/content-quiz.js"></script>
</body>
</html>
"""


def iframe_markup(filename: str, title: str) -> str:
    src = IFRAME_SRC.format(filename=filename)
    return (
        f'<iframe class="content-quiz-frame" '
        f'src="{src}" title="{title}" loading="lazy" scrolling="no"></iframe>'
    )


def main() -> None:
    text = NARRATIVE.read_text(encoding="utf-8")
    original_lines = text.count("\n") + (1 if text and not text.endswith("\n") else 0)

    QUIZ_DIR.mkdir(parents=True, exist_ok=True)

    for quiz_id, filename, title in QUIZZES:
        block = extract_quiz_div(text, quiz_id)
        (QUIZ_DIR / filename).write_text(
            wrap_quiz_page(block, title), encoding="utf-8"
        )
        text = text.replace(block, iframe_markup(filename, title), 1)

    if "## 第二部分" not in text:
        raise SystemExit("missing ## 第二部分 after transform")

    new_lines = text.count("\n") + (1 if text and not text.endswith("\n") else 0)
    if new_lines < 600:
        raise SystemExit(f"line count suspicious: {new_lines}")

    NARRATIVE.write_text(text, encoding="utf-8")
    print(f"Wrote {len(QUIZZES)} quiz pages under {QUIZ_DIR.relative_to(ROOT)}")
    print(f"Narrative: {original_lines} -> {new_lines} lines")


if __name__ == "__main__":
    main()