# /// script
# dependencies = []
# ///
"""Transform the Airtable 课程日期 dump into Convex session seed documents.

Each session row carries its leading/observing assignments as Airtable
student-record ids (temp fields, wired to Convex ids by the
migrations:wireSessionAssignments mutation after import) and resolved
assistant-teacher display names (助教 → the 教师 table, which is not
imported into Convex).
"""

import json
from pathlib import Path

HERE = Path(__file__).parent
TBL_SESSIONS = "tblQgLBaK0KENUuwT"
TBL_TEACHERS = "tblK2NxjToVdVQZuJ"


def quarter_label(date_str: str) -> str:
    year, month = date_str[:4], int(date_str[5:7])
    season = "春季" if month <= 6 else "秋季"
    return f"{year}{season}"


def main() -> None:
    sessions = json.loads((HERE / f"{TBL_SESSIONS}_table.json").read_text())
    teachers = {
        r["id"]: r["fields"]
        for r in json.loads((HERE / f"{TBL_TEACHERS}_table.json").read_text())
    }
    schema = json.loads((HERE / "_schema.json").read_text())
    teacher_primary = next(
        f["name"]
        for t in schema["tables"]
        if t["id"] == TBL_TEACHERS
        for f in t["fields"]
        if f["id"] == t["primaryFieldId"]
    )

    docs = []
    for rec in sessions:
        f = rec["fields"]
        assistants = [
            teachers[rid].get(teacher_primary, "(?)")
            for rid in f.get("助教", [])
            if rid in teachers
        ]
        docs.append(
            {
                "airtableId": rec["id"],
                "date": f.get("日期"),
                "quarter": quarter_label(f["日期"]),
                "assistantNames": assistants,
                "leaderIds": [],
                "observerIds": [],
                "leaderAirtableIds": f.get("主领", []),
                "observerAirtableIds": f.get("观察员", []),
            }
        )

    docs.sort(key=lambda d: d["date"])
    out = HERE / "sessions_seed.jsonl"
    with out.open("w") as fh:
        for d in docs:
            fh.write(json.dumps(d, ensure_ascii=False) + "\n")
    print(f"wrote {len(docs)} sessions -> {out}")
    print(f"date range: {docs[0]['date']} .. {docs[-1]['date']}")
    with_assignments = sum(
        1 for d in docs if d["leaderAirtableIds"] or d["observerAirtableIds"]
    )
    print(f"sessions with assignments: {with_assignments}")


if __name__ == "__main__":
    main()
