"""Who / when / where entity definitions for observation-phase highlighting."""

from typing import Literal

from .passages import get_passage_verses

EntityType = Literal["who", "when", "where"]


def _find_entity_offsets(
    passage: dict,
) -> list[tuple[int, int, int, EntityType, str]]:
    """Return list of (verse_n, start, end, type, label). start/end in verse text."""
    verses_list = get_passage_verses(passage)
    verse_by_n = {v["n"]: v["text"] for v in verses_list}

    raw: list[tuple[int, str, EntityType, str]] = [
        (36, "法利赛人", "who", "法利赛人"),
        (36, "耶稣", "who", "耶稣"),
        (37, "女人", "who", "女人"),
        (37, "罪人", "who", "罪人"),
        (37, "耶稣", "who", "耶稣"),
        (38, "耶稣", "who", "耶稣"),
        (39, "法利赛人", "who", "法利赛人"),
        (39, "女人", "who", "女人"),
        (39, "罪人", "who", "罪人"),
        (40, "耶稣", "who", "耶稣"),
        (40, "西门", "who", "西门"),
        (41, "耶稣", "who", "耶稣"),
        (41, "债主", "who", "债主"),
        (41, "两个人", "who", "两个人"),
        (42, "债主", "who", "债主"),
        (42, "两个人", "who", "两个人"),
        (42, "这两个人", "who", "这两个人"),
        (43, "西门", "who", "西门"),
        (43, "耶稣", "who", "耶稣"),
        (44, "女人", "who", "女人"),
        (44, "西门", "who", "西门"),
        (45, "女人", "who", "女人"),
        (46, "女人", "who", "女人"),
        (48, "女人", "who", "女人"),
        (49, "同席的人", "who", "同席的人"),
        (50, "耶稣", "who", "耶稣"),
        (50, "女人", "who", "女人"),
        (36, "吃饭", "when", "吃饭"),
        (36, "坐席", "when", "坐席"),
        (37, "坐席", "when", "坐席"),
        (45, "进来的时候", "when", "进来的时候"),
        (36, "法利赛人家里", "where", "法利赛人家里"),
        (37, "城里", "where", "城里"),
        (37, "法利赛人家里", "where", "法利赛人家里"),
        (44, "你的家", "where", "你的家"),
    ]

    out: list[tuple[int, int, int, EntityType, str]] = []
    for verse_n, phrase, etype, label in raw:
        text = verse_by_n.get(verse_n)
        if not text or phrase not in text:
            continue
        start = text.index(phrase)
        end = start + len(phrase)
        out.append((verse_n, start, end, etype, label))

    return _dedupe_overlapping(out)


def _dedupe_overlapping(
    entities: list[tuple[int, int, int, EntityType, str]],
) -> list[tuple[int, int, int, EntityType, str]]:
    """Per verse, keep non-overlapping spans (first occurrence wins)."""
    by_verse: dict[int, list[tuple[int, int, EntityType, str]]] = {}
    for verse_n, start, end, etype, label in entities:
        by_verse.setdefault(verse_n, []).append((start, end, etype, label))

    result: list[tuple[int, int, int, EntityType, str]] = []
    for verse_n in sorted(by_verse.keys()):
        spans = sorted(by_verse[verse_n], key=lambda x: x[0])
        last_end = -1
        for start, end, etype, label in spans:
            if start >= last_end:
                result.append((verse_n, start, end, etype, label))
                last_end = end
    return result


def get_entities_for_passage(passage: dict) -> list[dict]:
    """Return entities: verse_n, start, end, type, label, entity_id (stable)."""
    raw = _find_entity_offsets(passage)
    type_index: dict[tuple[int, EntityType], int] = {}
    out = []
    for verse_n, start, end, etype, label in raw:
        key = (verse_n, etype)
        type_index[key] = type_index.get(key, 0) + 1
        entity_id = f"v{verse_n}_{etype}_{type_index[key]}"
        out.append({
            "verse_n": verse_n,
            "start": start,
            "end": end,
            "type": etype,
            "label": label,
            "entity_id": entity_id,
        })
    return out


def build_verse_segments(passage: dict) -> list[list[dict]]:
    """Build segments per verse for template: list of verse segment lists.
    Segment = {"kind": "text", "content": "..."} or
              {"kind": "entity", "content": "...", "entity_id", "entity_type", "entity_label"}.
    """
    verses = get_passage_verses(passage)
    entities = get_entities_for_passage(passage)
    by_verse: dict[int, list[dict]] = {e["verse_n"]: [] for e in entities}
    for e in entities:
        by_verse[e["verse_n"]].append(e)
    for v in verses:
        by_verse.setdefault(v["n"], [])
    for verse_n in by_verse:
        by_verse[verse_n].sort(key=lambda x: x["start"])

    result: list[list[dict]] = []
    for v in verses:
        verse_n = v["n"]
        text = v["text"]
        ents = by_verse.get(verse_n) or []
        segments: list[dict] = []
        if not ents:
            segments.append({"kind": "text", "content": text})
            result.append(segments)
            continue
        pos = 0
        for e in ents:
            if e["start"] > pos:
                segments.append({"kind": "text", "content": text[pos : e["start"]]})
            segments.append({
                "kind": "entity",
                "content": text[e["start"] : e["end"]],
                "entity_id": e["entity_id"],
                "entity_type": e["type"],
                "entity_label": e["label"],
            })
            pos = e["end"]
        if pos < len(text):
            segments.append({"kind": "text", "content": text[pos:]})
        result.append(segments)
    return result
