"""Cross-check the hand-authored EN<->GR alignment against an independent source.

For every alignment group, compares the group's English chunk with the MACULA
(CLEAR Bible, Nestle1904) English *gloss* of each paired Greek token. Flags
groups with zero word overlap for manual review. This is triage, not proof:
glosses differ from translations by design, so every flag must be reviewed by
a person (see the git history of this file in the commit history).

MACULA source: github.com/clear-bible/macula-greek (Nestle1904/nodes/*.xml).
Token refs are 1-based (!1 = first word); alignment indices are 0-based.

Usage: python3 audit_alignment.py [--fetch]
"""

import json
import re
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from align_fine import ALIGN_1COR, ALIGN_GAL, ALIGN_PHIL, ALIGN_ROMANS  # noqa: E402

MACULA_DIR = Path("/tmp/strongs-macula")
FILES = {
    "ROM": ("romans", "06-romans.xml", ALIGN_ROMANS, 8, range(28, 40)),
    "1CO": ("1cor", "07-1corinthians.xml", ALIGN_1COR, 13, range(1, 14)),
    "PHP": ("phil", "11-philippians.xml", ALIGN_PHIL, 2, range(1, 12)),
    "GAL": ("gal", "09-galatians.xml", ALIGN_GAL, 5, range(13, 27)),
}

STOP = set("""a an the and or but that of to in on for with by from is are was were be been am
i we you he him his she they them their it its my your our this these those there then than so as
not no do does did done have has had will would shall should can could may might must each own out
up about into over under again what when where who whom whose why how also both""".split())

# gloss words that legitimately differ from NIV renderings (manual review log)
KNOWN_SYNONYMS = {
    ("tribulation", "trouble"), ("distress", "hardship"), ("enmities", "hatred"),
    ("strife", "discord"), ("sorcery", "witchcraft"), ("carousing", "orgies"),
    ("patience", "forbearance"), ("puffed", "proud"), ("persuaded", "convinced"),
    ("contentions", "ambition"), ("sensuality", "debauchery"),
}


def toks(s):
    return [w for w in re.findall(r"[a-z]+", s.lower()) if w not in STOP]


def related(a, b):
    return a == b or (len(a) >= 4 and len(b) >= 4 and (a.startswith(b[:4]) or b.startswith(a[:4])))


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "sgbs-training-site/1.0"})
    return urllib.request.urlopen(req, timeout=120).read()


def macula_path(xml_name):
    MACULA_DIR.mkdir(parents=True, exist_ok=True)
    p = MACULA_DIR / xml_name
    if not p.exists():
        p.write_bytes(fetch(
            "https://raw.githubusercontent.com/clear-bible/macula-greek/main/Nestle1904/nodes/" + xml_name
        ))
    return p


def macula_tokens(path, abbr, chapter):
    """(verse, 1-based token idx) -> (gloss, strong, unicode)."""
    xml = path.read_text(encoding="utf-8")
    out = {}
    for m in re.finditer(
        r'<Node [^>]*ref="' + abbr + r" " + str(chapter) + r':(\d+)!(\d+)"[^>]*>', xml
    ):
        tag = m.group(0)
        vs, idx = int(m.group(1)), int(m.group(2))
        sn = re.search(r'StrongNumber="(\d+)"', tag)
        gloss = re.search(r'Gloss="([^"]*)"', tag)
        uni = re.search(r'Unicode="([^"]*)"', tag)
        out[(vs, idx)] = (
            gloss.group(1).lower() if gloss else "",
            sn.group(1) if sn else "?",
            uni.group(1) if uni else "",
        )
    return out


def main():
    strict = "--fetch" in sys.argv
    total_ok = total_flag = total_empty = 0
    for abbr, (name, xml_name, align, ch, verses) in FILES.items():
        path = macula_path(xml_name)
        if strict:
            path.write_bytes(fetch(
                "https://raw.githubusercontent.com/clear-bible/macula-greek/main/Nestle1904/nodes/" + xml_name
            ))
        toks_by_verse = macula_tokens(path, abbr, ch)
        for v in verses:
            for gi, (chunk, idxs) in enumerate(align[v]):
                if not idxs:
                    total_empty += 1
                    continue
                if not chunk:
                    continue  # Greek-only group: nothing English to compare
                cw = toks(chunk)
                glosses = [toks(toks_by_verse.get((v, i + 1), ("", "?", "?"))[0]) for i in idxs]
                flat = {w for g in glosses for w in g}
                if any(related(a, b) for a in cw for b in flat):
                    total_ok += 1
                else:
                    pair_known = any(
                        (a, b) in KNOWN_SYNONYMS or (b, a) in KNOWN_SYNONYMS
                        for a in cw for g in glosses for b in g
                    )
                    if pair_known:
                        total_ok += 1
                        continue
                    total_flag += 1
                    print(f"FLAG {abbr} {ch}:{v} g{gi}  EN[{chunk}]  glosses{glosses}")
    print(f"\nGroups with Greek: {total_ok + total_flag} | overlap OK: {total_ok} | flagged: {total_flag} | EN-only: {total_empty}")


if __name__ == "__main__":
    main()
