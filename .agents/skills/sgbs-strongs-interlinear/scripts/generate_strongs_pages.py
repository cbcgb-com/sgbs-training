"""Generate lesson-4 exercise pages: NIV verse + Greek interlinear with Strong's
numbers, with hand-authored fine-grained EN<->GR alignment for hover highlighting.

Sources (all cited on the generated pages):
  - NIV English text: github.com/aruljohn/Bible-niv (per-book JSON, cached in /tmp)
  - Greek text: bolls.life API, TISCH (Tischendorf 8th ed., public domain), with
    Strong's numbers inline as <S>nnnn</S>
  - Alignment: hand-authored word/phrase groups in align_fine.py; verified below
    (English chunks must concatenate exactly to the verse text; Greek indices must
    be a full partition of the verse's tokens)

Cross-check tooling: audit_alignment.py compares every group's Greek tokens
against MACULA (Nestle1904) per-token glosses.

Usage: python3 generate_strongs_pages.py   (from anywhere; writes docs/exercises/lesson-4/)
"""

import html
import json
import re
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from align_fine import ALIGN_1COR, ALIGN_GAL, ALIGN_PHIL, ALIGN_ROMANS  # noqa: E402

def repo_root() -> Path:
    """Walk up to the directory containing mkdocs.yml (works from any depth)."""
    for parent in Path(__file__).resolve().parents:
        if (parent / "mkdocs.yml").exists():
            return parent
    raise SystemExit("repo root (mkdocs.yml) not found above " + str(Path(__file__).resolve()))


SITE = repo_root() / "docs" / "exercises" / "lesson-4"
NIV_CACHE = Path("/tmp/strongs-niv")
STRONGS_DICT = Path("/tmp/strongs-greek-dictionary.js")
STRONGS_DICT_URL = "https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js"

NIV_BOOKS = {
    "Romans": "Romans.json",
    "1 Corinthians": "1%20Corinthians.json",
    "Philippians": "Philippians.json",
    "Galatians": "Galatians.json",
}

PASSAGES = [
    {
        "file": "romans-8-28-39.md",
        "niv_book": "Romans",
        "bolls_book": 45,
        "chapter": 8,
        "vfrom": 28,
        "vto": 39,
        "title": "《羅馬書》8:28-39",
        "align": ALIGN_ROMANS,
        "biblehub": "https://biblehub.com/interlinear/romans/8-28.htm",
    },
    {
        "file": "1corinthians-13-1-13.md",
        "niv_book": "1 Corinthians",
        "bolls_book": 46,
        "chapter": 13,
        "vfrom": 1,
        "vto": 13,
        "title": "《哥林多前書》13:1-13",
        "align": ALIGN_1COR,
        "biblehub": "https://biblehub.com/interlinear/1_corinthians/13-1.htm",
    },
    {
        "file": "philippians-2-1-11.md",
        "niv_book": "Philippians",
        "bolls_book": 50,
        "chapter": 2,
        "vfrom": 1,
        "vto": 11,
        "title": "《腓立比書》2:1-11",
        "align": ALIGN_PHIL,
        "biblehub": "https://biblehub.com/interlinear/philippians/2-1.htm",
    },
    {
        "file": "galatians-5-13-26.md",
        "niv_book": "Galatians",
        "bolls_book": 48,
        "chapter": 5,
        "vfrom": 13,
        "vto": 26,
        "title": "《加拉太書》5:13-26",
        "align": ALIGN_GAL,
        "biblehub": "https://biblehub.com/interlinear/galatians/5-13.htm",
    },
]

INTRO = (
    "每節經文：上排是 NIV 英文，下排是希臘原文；每個原文詞下方的數字，"
    "就是它的史特朗號碼（G＝希臘文，H＝希伯來文）。把滑鼠移到任何一個字上，"
    "它和對應的字會同時亮起；**點擊**任何一個字，右側會顯示該詞的字典釋義——"
    "多個譯法並列，哪一個最貼合這節經文，判斷留給你。若一個字單獨亮起，"
    "表示它在另一邊沒有直接對應的字（譯文補充的字，或原文裏未譯出的虛詞）。"
    "做詞彙研究時，也可到[微讀聖經——原文工具](https://wd.bible/exegesis)"
    "查考原文字典和相關經文。"
)


def sources_block(passage: dict) -> str:
    return (
        "## 資料來源\n\n"
        "- 英文經文：《新國際版》（New International Version®, NIV®）。"
        "Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. "
        "All rights reserved.（全站引用未超過 500 節，並隨文附本聲明。）\n"
        "- 希臘原文：Tischendorf 第八版（Novum Testamentum Graece, 1869–72，公版），"
        "經 [bolls.life](https://bolls.life) API 提供。\n"
        "- 史特朗號碼：出自《史特朗經文彙編》（Strong's Exhaustive Concordance，公版）；"
        "字典釋義採 [Open Scriptures](https://github.com/openscriptures/strongs) 數位版（CC-BY-SA）。\n"
        f"- 對照查驗：[BibleHub 逐字對照]({passage['biblehub']})・"
        "[STEP Bible](https://www.stepbible.org)・"
        "[微讀聖經原文工具](https://wd.bible/exegesis)。本頁的英希對照組為人工整理，"
        "產生時已以程式逐字驗證完整對應；如有疑問，請以上列查驗工具為準。"
    )


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "sgbs-training-site/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def niv_path(book_key: str) -> Path:
    NIV_CACHE.mkdir(parents=True, exist_ok=True)
    p = NIV_CACHE / (book_key + ".json")
    if not p.exists():
        p.write_bytes(fetch("https://raw.githubusercontent.com/aruljohn/Bible-niv/master/" + NIV_BOOKS[book_key]))
    return p


def parse_greek(text: str):
    text = re.sub(r"</?i>", "", text)
    words = []
    for token in text.split(" "):
        if not token:
            continue
        m = re.match(r"^(.*?)<S>(\d+)</S>$", token)
        if m:
            words.append((m.group(1), m.group(2)))
        else:
            plain = re.sub(r"<[^>]+>", "", token)
            if plain:
                words.append((plain, None))
    return words


def esc(s: str) -> str:
    return html.escape(s, quote=False)


def verify_verse(vnum, align_list, en_words, greek_words):
    rebuilt = " ".join(c for c, _ in align_list if c)
    expected = " ".join(en_words)
    if rebuilt != expected:
        raise SystemExit(f"v{vnum}: EN chunk mismatch\n  got:      {rebuilt}\n  expected: {expected}")
    used = sorted(i for _, idxs in align_list for i in idxs)
    if used != list(range(len(greek_words))):
        raise SystemExit(
            f"v{vnum}: GK index partition error\n  used: {used}\n  want: {list(range(len(greek_words)))}"
        )


def render_verse(vnum, align_list, en_words, greek_words):
    group_of_en = {}
    group_of_gk = {}
    for gi, (chunk, idxs) in enumerate(align_list):
        gid = f"{vnum}-{gi}"
        if chunk:
            for w in chunk.split(" "):
                group_of_en[len(group_of_en)] = (gid, w)
        for i in idxs:
            group_of_gk[i] = gid

    en_spans = [
        f'<span class="strongs-en" data-g="{gid}">{esc(w)}</span>'
        for gid, w in group_of_en.values()
    ]
    gk_spans = []
    for i, (word, num) in enumerate(greek_words):
        gid = group_of_gk[i]
        inner = esc(word) + (f'<span class="strongs-num">G{esc(num)}</span>' if num else "")
        gk_spans.append(f'<span class="strongs-word" data-g="{gid}">{inner}</span>')

    return (
        f'<div class="strongs-verse">\n'
        f'<p class="strongs-niv"><span class="strongs-vnum">{vnum}</span>{" ".join(en_spans)}</p>\n'
        f'<p class="strongs-greek">{"".join(gk_spans)}</p>\n'
        f"</div>\n"
    )


def load_strongs_dictionary() -> dict:
    """Fetch (and cache) the OpenScriptures Strong's Greek dictionary (JSON-in-JS)."""
    if not STRONGS_DICT.exists():
        STRONGS_DICT.write_bytes(fetch(STRONGS_DICT_URL))
    raw = STRONGS_DICT.read_text(encoding="utf-8")
    obj, _ = json.JSONDecoder().raw_decode(raw[raw.find("{"):])
    return obj


def build_lexicon(used_numbers: set) -> dict:
    dictionary = load_strongs_dictionary()
    missing = sorted(n for n in used_numbers if f"G{n}" not in dictionary)
    if missing:
        raise SystemExit(f"Strong's dictionary missing entries for: {missing}")
    lexicon = {}
    for n in sorted(used_numbers, key=int):
        e = dictionary[f"G{n}"]
        lexicon[f"G{n}"] = {
            "lemma": e.get("lemma", ""),
            "translit": e.get("translit", ""),
            "kjv_def": e.get("kjv_def", ""),
            "strongs_def": e.get("strongs_def", "").strip(),
            "derivation": e.get("derivation", "").strip(),
        }
    return lexicon


def main():
    all_used_numbers = set()
    SITE.mkdir(parents=True, exist_ok=True)
    for p in PASSAGES:
        niv_data = json.loads(niv_path(p["niv_book"]).read_text())
        ch = [c for c in niv_data["chapters"] if str(c["chapter"]) == str(p["chapter"])][0]
        niv_verses = {str(v["verse"]): v["text"].split() for v in ch["verses"]}

        raw = fetch(
            f"https://bolls.life/get-chapter/TISCH/{p['bolls_book']}/{p['chapter']}/"
        ).decode("utf-8")
        greek_ch = json.loads(raw)
        greek_verses = {int(v["verse"]): parse_greek(v["text"]) for v in greek_ch}

        align = p["align"]
        got, want = sorted(align.keys()), list(range(p["vfrom"], p["vto"] + 1))
        if got != want:
            raise SystemExit(f"{p['file']}: alignment verses {got} != {want}")

        parts = [f"# {p['title']}（NIV＋原文史特朗號碼）\n", INTRO + "\n"]
        for v in want:
            verify_verse(v, align[v], niv_verses[str(v)], greek_verses[v])
            parts.append(render_verse(v, align[v], niv_verses[str(v)], greek_verses[v]))
        parts.append(sources_block(p) + "\n")

        (SITE / p["file"]).write_text("\n".join(parts), encoding="utf-8")
        n_groups = sum(len(align[v]) for v in want)
        for v in want:
            for (_, num) in greek_verses[v]:
                if num:
                    all_used_numbers.add(num)
        print(f"OK {p['file']}: {len(want)} verses, {n_groups} fine-grained groups")

    lexicon = build_lexicon(all_used_numbers)
    (SITE / "strongs-lexicon.json").write_text(
        json.dumps(lexicon, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"OK strongs-lexicon.json: {len(lexicon)} entries")


if __name__ == "__main__":
    main()
