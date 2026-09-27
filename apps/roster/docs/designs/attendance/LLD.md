# Attendance (出席) — Low-Level Design

**Created**: 2026-09-20
**HLD Link**: ../../high-level-design.md

## Overview

The HLD listed the instructor attendance editor as future work: the
`attendance` table, the `quarterAttendance` read, and the `recordAttendance`
mutation all existed (built during the 2026-09-05 Airtable migration), and
the roster's 缺課 view *displayed* the marks — but nothing in the UI could
record them. Taking attendance meant the CLI. This feature adds the write
surface: an instructor-only 出席 tab where the teacher picks a class date
and marks each student 出席 or 缺席, with a bulk "everyone came" path for
the Sunday-after-class flow.

No schema change: the feature composes the existing
`attendance` table (one row per student × class date), the replicated
`missed` count on the student row, and the sessions calendar as the
source of valid dates.

## Data Model (existing, unchanged)

- `attendance` — `{ studentId, quarter, date, attended }`; a missing row
  is 未記錄, `attended: false` is 缺席.
- `students.missed` — replicated count of the student's absent rows,
  maintained at write time.
- `sessions` — the calendar; a date is recordable only while it is a
  session of the student's quarter.

## Backend surface (`convex/students.ts`)

### Read: `students:quarterAttendance` (existing, extended)

Per-student marks aligned with the quarter's sorted session dates
(`"yes" | "no" | "none"`), active (non-withdrawn) students only. Extended
with `groupName` and `photoStorageId` so the recording sheet can render
the same identity columns as every other roster table. Instructor-gated.

### Write: `students:recordAttendance` (existing)

Single upsert of one (student, date) mark; rejects dates that are not
active sessions of the student's quarter (此日期不是該季的上課日期);
recomputes `missed` via the shared `upsertAttendance` helper.

### Write: `students:clearAttendance` (new)

Deletes the (student, date) row — back to 未記錄 — and recomputes
`missed`. Same instructor gate and same date validation as
`recordAttendance` (the clear must not resurrect a date that left the
calendar). Clearing a mark that was never recorded is a no-op returning
`"unchanged"`. This is the third state the UI needs: two buttons
(出席／缺席) cover the two recorded states, and tapping the active one
again un-records.

### Write: `students:markAllAttended` (new)

The Sunday flow: after class, most everyone came. One call fills every
**unrecorded** active student of the quarter with `attended: true` for the
given date. Deliberate semantics:

- **Never overwrites an existing row.** An explicit 缺席 (or 出席) mark is
  a decision; the bulk fill only completes the sheet. The UI says so
  (只填寫尚未記錄的學員).
- **Skips withdrawn students** — they left the quarter's roster and their
  sheet is history.
- Validates `date` against the quarter's sessions before touching
  anything; `quarter` defaults to the current one, so a stray future date
  cannot create rows in the wrong season.
- Created rows are all `attended: true`, so `missed` is untouched — no
  recompute pass.

## Recording semantics (the three-state toggle)

The sheet exposes 出席 and 缺席 buttons per student:

| Current state | Tap 出席 | Tap 缺席 |
| ------------- | -------- | -------- |
| 未記錄 | record attended | record absent |
| 出席 | **clear → 未記錄** | record absent |
| 缺席 | record attended | **clear → 未記錄** |

Tapping the active mark again un-records it (clearAttendance); tapping the
other one flips it (recordAttendance). No confirmation dialogs — every
state is one tap away and mistakes are cheap to undo, which matches how
the sheet is actually used (standing at the door, phone in hand).

## Scoping decisions

- **Current quarter only.** Like 課堂安排, the UI shows the current
  season; historical quarters stay readable through the roster views and
  editable through the API if ever needed.
- **Default date = today when it is a class day, else the next upcoming
  date, else the last date of the season.** The sheet opens on the class
  that just happened (or is about to).
- **Withdrawn students never appear** on the sheet; their attendance rows
  persist untouched, exactly as with the withdrawal feature.
- **No audit columns.** The table has no actor/timestamp fields, matching
  the roster-wide precedent (the withdrawal LLD declined them too). Who
  marked what is implicit — instructors share the allowlist.

## UI (`src/Attendance.tsx`, instructor tab 出席)

- Tab sits between 名單 and 課堂安排 — a recurring weekly task, one tap
  from the roster.
- Date chip row across the top (9月20日（日）…), selected chip highlighted;
  below it a per-date tally (已記錄 X/Y · 出席 A · 缺席 B) and the
  「未記錄全部出席」 bulk button, disabled when nothing is unrecorded.
- Student table: 序號, 名字 (48px avatar + serif name, 已退出 never
  appears) with the 出席／缺席 toggle between avatar and name — the
  fixed-width avatar and toggle keep the buttons and names in aligned
  columns and the marks on-screen on a phone — then 團契, 小組, and the
  season 缺課 count for context.
- Legend and error banner follow the roster's conventions (aria-pressed
  toggles, `role="alert"` errors, tabular numbers).

## Related Files

- `convex/students.ts` — `quarterAttendance`, `recordAttendance`,
  `upsertAttendance`, `clearAttendance`, `markAllAttended`
- `src/Attendance.tsx` — the sheet
- `src/App.tsx` — instructor tab wiring
- `scripts/test-attendance.mjs` — end-to-end walkthrough against dev
