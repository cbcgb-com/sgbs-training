# /// script
# dependencies = []
# ///
"""Transform the Airtable 学员名单 dump into Convex-ready seed documents.

- Flattens record.fields into top-level keys (Chinese field names preserved).
- Assignments (主领日期/观察日期) are NOT imported: they live in the
  sessions table (leaderIds/observerIds), already reconciled from the
  legacy per-student arrays.
  against Airtable's stored value.
- Converts Airtable's createdTime into the document's true system
  `_creationTime` (the single creation-time column in Convex).
- Emits present=true and missed=0: attendance lives in the Convex
  attendance table (one row per student per session date) and is NOT
  reconstructible from Airtable — preserve it via `convex export`.
- Writes students_seed.jsonl (one document per line) for `npx convex import`.
"""

import json
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent  # airtable_dump/ — dumps live here


def iso_to_ms(iso: str) -> float:
    """Parse an ISO-8601 timestamp (Airtable createdTime) to epoch ms."""
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000.0

TBL_STUDENTS = "tblty4DoMC2Pmfrw6"
LINKS = {
    "功课（提交）": ("tblzkrTts5Fr5kw1l", "功课（提交）"),
}

# Convex field names must be non-control ASCII, so documents use English
# keys (UI labels remain Chinese).
KEY_MAP = {
    "名字": "name",
    "團契": "fellowship",
    "郵箱": "email",
    "受洗時間": "baptismTime",
    "参与训练的季度": "quarter",
    "小组名字": "groupName",
    "性別": "gender",
    "帶領查經經驗": "leadingExperience",
}


def load_schema():
    return json.loads((HERE / "_schema.json").read_text())


def load_records(table_id: str) -> dict[str, dict]:
    """Return recId -> fields dict for a dumped table."""
    path = HERE / f"{table_id}_table.json"
    records = json.loads(path.read_text())
    return {r["id"]: r["fields"] for r in records}


def primary_field_name(schema, table_id: str) -> str:
    for t in schema["tables"]:
        if t["id"] == table_id:
            pid = t["primaryFieldId"]
            for f in t["fields"]:
                if f["id"] == pid:
                    return f["name"]
    raise KeyError(table_id)


def display(fields: dict, field_name: str):
    v = fields.get(field_name)
    return v if v not in (None, "") else "(空)"


def main() -> None:
    schema = load_schema()
    lookup = {tid: load_records(tid) for tid, _ in set(
        (ref, None) for ref, _ in LINKS.values())}
    primaries = {tid: primary_field_name(schema, tid) for tid in lookup}

    students = json.loads((HERE / f"{TBL_STUDENTS}_table.json").read_text())

    docs = []
    for rec in students:
        f = rec["fields"]
        doc = {
            "airtableId": rec["id"],
            # The system _creationTime is the single creation-time column;
            # seed imports backfill it with Airtable's true createdTime.
            "_creationTime": iso_to_ms(rec["createdTime"]),
        }

        # Scalar fields, copied as-is.
        for key in [
            "名字", "團契", "郵箱", "受洗時間", "参与训练的季度", "小组名字",
            "性別", "帶領查經經驗",
        ]:
            if key in f:
                doc[key] = f[key]

        # Linked-record fields -> resolved display values.
        for field_name, (ref_table, out_key) in LINKS.items():
            ids = f.get(field_name, [])
            doc[out_key] = [
                display(lookup[ref_table][rid], primaries[ref_table])
                for rid in ids if rid in lookup[ref_table]
            ]

        # Assignments live in the sessions table (leaderIds/observerIds),
        # already reconciled from the legacy per-student arrays; they are
        # not imported from Airtable.
        doc.pop("功课（提交）", None)
        doc.pop("功课提交数目", None)

        # Attendance lives in the Convex attendance table (one row per
        # student per session date) and is NOT reconstructible from
        # Airtable. 出席 is always true; missed starts at 0.
        doc["present"] = True
        doc["missed"] = 0

        docs.append(doc)

    out = HERE / "students_seed.jsonl"
    with out.open("w") as fh:
        for d in docs:
            ascii_doc = {KEY_MAP.get(k, k): v for k, v in d.items()}
            fh.write(json.dumps(ascii_doc, ensure_ascii=False) + "\n")

    print(f"wrote {len(docs)} documents -> {out}")

    # Quarter distribution (for the 本季度 view sanity check).
    from collections import Counter
    quarters = Counter(d.get("参与训练的季度") for d in docs)
    for q, n in sorted(quarters.items(), key=lambda kv: str(kv[0])):
        print(f"  {q}: {n}")


if __name__ == "__main__":
    main()
