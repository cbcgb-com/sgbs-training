# /// script
# dependencies = []
# ///
"""Transform the Airtable 学员名单 dump into Convex-ready seed documents.

- Flattens record.fields into top-level keys (Chinese field names preserved).
- Resolves multipleRecordLinks (主领日期/观察日期 -> 课程日期, 功课（提交） -> 功课,
  助教 -> 教师) into arrays of display values using the other dumps.
- Replicates the Missed formula (5 - number of checked 課堂) and verifies it
  against Airtable's stored value; same for 功课提交数目 (count of 功课（提交）).
- Writes students_seed.jsonl (one document per line) for `npx convex import`.
"""

import json
from pathlib import Path

HERE = Path(__file__).parent  # airtable_dump/ — dumps live here

TBL_STUDENTS = "tblty4DoMC2Pmfrw6"
LINKS = {
    "主领日期": ("tblQgLBaK0KENUuwT", "主领日期"),
    "观察日期": ("tblQgLBaK0KENUuwT", "观察日期"),
    "功课（提交）": ("tblzkrTts5Fr5kw1l", "功课（提交）"),
    "助教": ("tblK2NxjToVdVQZuJ", "助教"),
}
CLASS_CHECKBOXES = ["課堂（一）", "課堂（二）", "課堂（三）", "課堂（四）", "課堂（五）"]

# Convex field names must be non-control ASCII, so documents use English
# keys (UI labels remain Chinese).
KEY_MAP = {
    "名字": "name",
    "團契": "fellowship",
    "郵箱": "email",
    "受洗時間": "baptismTime",
    "参与训练的季度": "quarter",
    "小组名字": "groupName",
    "带领日期": "leadingDate",
    "观察的日期": "observingDate",
    "性別": "gender",
    "帶領查經經驗": "leadingExperience",
    "出席": "present",
    "課堂（一）": "class1",
    "課堂（二）": "class2",
    "課堂（三）": "class3",
    "課堂（四）": "class4",
    "課堂（五）": "class5",
    "Missed": "missed",
    "主领日期": "leadingSessions",
    "观察日期": "observingSessions",
    "功课（提交）": "homeworkSubmitted",
    "助教": "teachingAssistants",
    "书本订购": "bookOrder",
    "功课提交数目": "homeworkCount",
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
    mismatch_missed = 0
    mismatch_count = 0
    for rec in students:
        f = rec["fields"]
        doc = {
            "airtableId": rec["id"],
            "createdTime": rec["createdTime"],
        }

        # Scalar fields, copied as-is.
        for key in [
            "名字", "團契", "郵箱", "受洗時間", "参与训练的季度", "小组名字",
            "带领日期", "观察的日期", "性別", "帶領查經經驗", "出席",
            *CLASS_CHECKBOXES, "书本订购",
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

        # Replicate computed fields + verify.
        computed_missed = sum(1 for c in CLASS_CHECKBOXES if not f.get(c))
        if "Missed" in f and f["Missed"] != computed_missed:
            mismatch_missed += 1
            print(
                f"  Missed mismatch {rec['id']}: airtable={f['Missed']} "
                f"computed={computed_missed}"
            )
        doc["Missed"] = computed_missed

        computed_count = len(f.get("功课（提交）", []))
        if "功课提交数目" in f and f["功课提交数目"] != computed_count:
            mismatch_count += 1
            print(
                f"  功课提交数目 mismatch {rec['id']}: "
                f"airtable={f['功课提交数目']} computed={computed_count}"
            )
        doc["功课提交数目"] = computed_count

        docs.append(doc)

    out = HERE / "students_seed.jsonl"
    with out.open("w") as fh:
        for d in docs:
            ascii_doc = {KEY_MAP.get(k, k): v for k, v in d.items()}
            fh.write(json.dumps(ascii_doc, ensure_ascii=False) + "\n")

    print(f"wrote {len(docs)} documents -> {out}")
    print(f"Missed formula mismatches: {mismatch_missed}")
    print(f"功课提交数目 mismatches: {mismatch_count}")

    # Quarter distribution (for the 本季度 view sanity check).
    from collections import Counter
    quarters = Counter(d.get("quarter") for d in docs)
    for q, n in sorted(quarters.items(), key=lambda kv: str(kv[0])):
        print(f"  {q}: {n}")


if __name__ == "__main__":
    main()
