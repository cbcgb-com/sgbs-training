# Homework (功課記錄) — Low-Level Design

**Created**: 2026-10-05
**HLD Link**: ../../high-level-design.md
**Issue**: cbcgb-com/sgbs-training#159

## Overview

Attendance lives in Convex; homework completion lived only inside the
weekly shared Google Docs — knowing who did the homework meant opening
the docs and reading them by hand. This feature adds a Convex record of
**who did which homework for which week**, structured in parallel to
`attendance`, plus a read-only instructor view. The rows are written by
an agent workflow (Eric hands over the weekly docs, the agent reads who
filled in what), never by hand — there is no manual write UI in v1.

## The two homework types

Homework is prepared in shared Google Docs created weekly by the
email-generator app (`sgbs_training/docs.py` — one doc per scripture per
type, anyone-with-link write access):

- **查經筆記 (study notes)** — one doc per week with one page per
  student. "Done" = the student filled in their own page.
- **查經題目 (study questions)** — one doc per week with one page per
  group, prepped by the session's 主領 and reviewed by the 觀察. "Done"
  = the leader/observer actually contributed to their group's page.

Because each page belongs to a known person/group, the agent can read
the doc text and decide per person whether the page has real content.
That is the entire tracking mechanism. Weeks without docs (the
no-homework lesson, 課程信息介紹) simply have no rows.

## Data Model

New table in `convex/schema.ts`, mirroring `attendance`:

- `homework` — `{ studentId, quarter, date, type, done, sourceDocUrl?,
  recordedAt }` with `by_student` and `by_quarter_date` indexes.
  `type` is `"notes"` (筆記) or `"questions"` (題目); `done` is binary
  like `attendance.attended`. A missing row means **未記錄** — never
  conflated with 未完成. `sourceDocUrl` records the Google Doc the row
  came from; `recordedAt` (ms) is refreshed on each agent write.

## Backend surface (`convex/homework.ts`)

### Write: `homework:recordHomework` (internal mutation)

The single stable entry point for the agent. One row per call — a loop
of independent calls is resumable mid-week, which suits the agent
re-running a week after doc corrections. Rules (parallel to
`recordAttendance`):

- Validates `date` is an active session date of the student's quarter
  (此日期不是該季的上課日期).
- `type: "questions"` is only valid for students in that session's
  `leaderIds` or `observerIds` (查經題目僅限該週的主領或觀察) — settled:
  questions credit goes to leader **and** observer.
- Upsert on `(studentId, date, type)`: re-running a week updates in
  place, never duplicates. Returns `"created" | "updated" |
  "unchanged"`; `recordedAt` only refreshes on a real change.
- `quarter` is derived from the student row, not passed in, exactly like
  the attendance writes.

Internal — deliberately not callable from the browser ("Could not find
public function"). The agent writes through the CLI:

```bash
npx convex run --prod homework:recordHomework '{
  "studentId": "j57…", "date": "2026-10-04",
  "type": "notes", "done": true,
  "sourceDocUrl": "https://docs.google.com/document/d/…"
}'
```

### Write: `homework:clearHomework` (internal mutation)

Retraction path: deletes the (student, date, type) row — back to
未記錄 — for the rare case a record was written for someone who
shouldn't have one at all (wrong person, wrong page). Correcting
`done` is just `recordHomework` again. Clearing an unrecorded row is a
no-op returning `"unchanged"`. Mirrors `students:clearAttendance`; the
e2e test uses it for cleanup.

### Read: `homework:quarterRoster` (internal query)

Active students of a quarter with `_id`, `name`, `groupName`,
`fellowship` (zh-Hant sorted) — the agent's lookup table for turning
Google Doc page headings into student ids. Internal because the CLI
caller bypasses the browser auth gates by design; the browser already
has `students:byQuarter` for this data.

### Read: `homework:byQuarter` (public query, instructor-gated)

All homework rows of a quarter (default: current) as minimal marks
`{ studentId, date, type, done }`. The UI builds a
`${studentId}:${date}:${type}` → done map; absence from the map is the
third state. Same 僅限同工存取 gate as every roster read.

## Agent workflow (the weekly run)

1. Eric hands the agent the Google Doc link(s) for the week (notes doc,
   questions doc when it exists) plus the class date the homework is
   for.
2. The agent resolves names to ids:
   `npx convex run homework:quarterRoster '{}'` (dev: drop `--prod`).
   Names on doc pages that match no roster row are flagged to Eric, not
   guessed.
3. The agent reads the doc text — notes doc pages are headed by student
   name; questions doc pages show the group's 主領/觀察 — and decides
   per person whether the page has real content.
4. The agent writes one `recordHomework` call per (student, type), with
   `sourceDocUrl` set to the doc it read. Notes rows for everyone;
   questions rows only for that week's leaders/observers.
5. Spot-check via `npx convex run homework:byQuarter '{}'` (or the 課堂
   安排 按週次 view) before reporting done.

## Read UI (Option A — 課堂安排 按週次)

The by-week instructor layout gains a 組員（筆記） column and turns the
主領／觀察 headers into 主領（題目）／觀察（題目）:

- Every member's chip in 組員（筆記） carries their notes mark; the
  week's 主領/觀察 chips carry their questions mark. The marks appear
  exactly where instructors already look when planning the week; the
  assignment cells stay editable (marks are read-only riders).
- Three states, encoded as glyph **and** color (never color alone):
  ✓ 已完成 (ink), ✗ 未完成 (vermilion), – 未記錄 (quiet rule-gray, so
  "agent hasn't run yet" never reads as "student slacked"). Legend line
  at the top of the layout.
- One-line empty state per week: 「本週尚未記錄功課」.
- The by-group layout (按小組) and the student schedule are untouched —
  students never see homework marks (the read is instructor-gated
  server-side and skipped client-side).
- Marks stay legible at phone width: inline glyphs on name chips inside
  the existing horizontally-scrollable table.

## Out of scope (v1)

- Manual write/edit UI — the agent is the only writer.
- Student-facing visibility of their own record (follow-up candidate;
  per-student history is the natural next read).
- Reminders/nudges for missing homework.

## Testing

`scripts/test-homework.mjs` (dev deployment, seeded demo data) drives
the REAL agent entry point — `npx convex run` for the internal writes —
and asserts: the browser client cannot call the internal mutations;
unauthenticated/student reads are rejected; non-session dates are
rejected; questions credit is rejected for non-主領/觀察; the upsert
never duplicates (identical re-run → `"unchanged"`); flips update in
place; `clearHomework` retracts; the read is instructor-only; dev is
left clean. Prereqs match `scripts/test-attendance.mjs`.
