# /// script
# dependencies = ["requests"]
# ///
"""Dump an Airtable base to JSON: schema (tables/fields/views) + all records.

Reads the token from AIRTABLE_TOKEN env var, falling back to the token stored
by `airtable-mcp configure` in ~/.airtable/cli.json. Never prints the token.
"""

import json
import os
import re
import sys
import time
from pathlib import Path

import requests

BASE_ID = "appPjFf1hVqSChSyo"
OUT = Path(__file__).parent


def load_token() -> str:
    tok = os.environ.get("AIRTABLE_TOKEN", "").strip()
    if tok:
        return tok
    cli_json = Path.home() / ".airtable" / "cli.json"
    if cli_json.exists():
        data = json.loads(cli_json.read_text())

        def find_pat(obj):
            if isinstance(obj, str) and obj.startswith("pat"):
                return obj
            if isinstance(obj, dict):
                for v in obj.values():
                    found = find_pat(v)
                    if found:
                        return found
            if isinstance(obj, list):
                for v in obj:
                    found = find_pat(v)
                    if found:
                        return found
            return None

        tok = find_pat(data)
        if tok:
            return tok
    sys.exit("No Airtable token found (env AIRTABLE_TOKEN or ~/.airtable/cli.json)")


def safe_name(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "_", name).strip("_") or "table"


def main() -> None:
    token = load_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Base schema: tables, fields, and views (names + types).
    r = requests.get(
        f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables",
        headers=headers,
        timeout=60,
    )
    r.raise_for_status()
    schema = r.json()
    (OUT / "_schema.json").write_text(
        json.dumps(schema, indent=2, ensure_ascii=False)
    )

    print(f"Base {BASE_ID}: {len(schema['tables'])} tables")
    for t in schema["tables"]:
        views = ", ".join(f"{v['name']}({v['type']})" for v in t.get("views", []))
        print(f"  {t['id']}  {t['name']}: {len(t['fields'])} fields | views: {views}")

    # 2. All records per table, with pagination.
    for t in schema["tables"]:
        tid, name = t["id"], t["name"]
        records = []
        offset = None
        while True:
            params = {"offset": offset} if offset else {}
            rr = requests.get(
                f"https://api.airtable.com/v0/{BASE_ID}/{tid}",
                headers=headers,
                params=params,
                timeout=60,
            )
            rr.raise_for_status()
            page = rr.json()
            records.extend(page.get("records", []))
            offset = page.get("offset")
            if not offset:
                break
            time.sleep(0.25)

        slug = safe_name(name)
        path_stem = f"{tid}_{slug}"
        (OUT / f"{path_stem}.json").write_text(
            json.dumps(records, indent=2, ensure_ascii=False)
        )
        with (OUT / f"{path_stem}.jsonl").open("w") as f:
            for rec in records:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        print(f"  dumped {name}: {len(records)} records -> {path_stem}.json/.jsonl")


if __name__ == "__main__":
    main()
