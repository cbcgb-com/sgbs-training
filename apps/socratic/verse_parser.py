"""Parse verse references from coach reply for passage highlighting."""

import re

# Verse range for this passage (Luke 7:36-50)
VERSE_MIN = 36
VERSE_MAX = 50


def parse_verse_ranges(text: str) -> list[int]:
    """
    Extract verse numbers from text (e.g. "verses 38-42" or "v. 44-48").
    Returns a unique, sorted list of verse numbers in [VERSE_MIN, VERSE_MAX].
    """
    if not text or not text.strip():
        return []

    numbers: set[int] = set()

    # Ranges: "verses 38-42", "verse 38‑42" (incl. Unicode dash U+2011), "v. 44-48", "38-42"
    range_pattern = re.compile(
        r"(?:verses?|v\.?|vv\.?)\s*(\d+)\s*[-–—\u2011]\s*(\d+)|(\d+)\s*[-–—\u2011]\s*(\d+)",
        re.IGNORECASE,
    )
    for m in range_pattern.finditer(text):
        if m.group(1) is not None:
            start, end = int(m.group(1)), int(m.group(2))
        else:
            start, end = int(m.group(3)), int(m.group(4))
        for n in range(start, end + 1):
            if VERSE_MIN <= n <= VERSE_MAX:
                numbers.add(n)

    # Ranges with Chinese 节: "47-49节", "47－49节"
    range_zh_pattern = re.compile(r"(\d+)\s*[-–—\u2011\u2013]\s*(\d+)\s*节")
    for m in range_zh_pattern.finditer(text):
        start, end = int(m.group(1)), int(m.group(2))
        for n in range(start, end + 1):
            if VERSE_MIN <= n <= VERSE_MAX:
                numbers.add(n)

    # Singles: "verse 47", "v. 47", "v47", "42节" (Chinese)
    single_pattern = re.compile(
        r"(?:verses?\s+)?v\.?\s*(\d+)\b|verse\s+(\d+)\b|(\d+)\s*节",
        re.IGNORECASE,
    )
    for m in single_pattern.finditer(text):
        n = int(m.group(1) or m.group(2) or m.group(3))
        if VERSE_MIN <= n <= VERSE_MAX:
            numbers.add(n)

    return sorted(numbers)
