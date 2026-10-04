# Attendance (出席) — EARS

**Parent LLD**: ./LLD.md

## Backend Gates

- [ ] **ATT-GATE-001**: If a non-instructor calls any attendance write
      (`recordAttendance`, `clearAttendance`, `markAllAttended`), then the
      system shall reject it with 僅限同工存取.
- [ ] **ATT-GATE-002**: If an attendance write names a date that is not an
      active session date of the student's quarter, then the system shall
      reject it with 此日期不是該季的上課日期.
- [ ] **ATT-GATE-003**: The system shall reject reads and writes for
      unauthenticated callers with 請先登入.

## Single Mark

- [ ] **ATT-MARK-001**: Where the actor is an active instructor, the
      system shall upsert one (student, date) row with
      `attended: true/false` via `students:recordAttendance`.
- [ ] **ATT-MARK-002**: When a mark is created or changed, the system
      shall recompute the student's replicated `missed` count to equal the
      number of their `attended: false` rows.
- [ ] **ATT-MARK-003**: Where the instructor clears a recorded mark, the
      system shall delete the (student, date) row, recompute `missed`, and
      return `"deleted"`.
- [ ] **ATT-MARK-004**: Where the instructor clears a mark that was never
      recorded, the system shall treat it as a no-op and return
      `"unchanged"`.

## Bulk Fill (未記錄全部出席)

- [ ] **ATT-BULK-001**: When `students:markAllAttended` runs for a date,
      the system shall create `attended: true` rows for every active
      student of the quarter who has no row for that date.
- [ ] **ATT-BULK-002**: The system shall never overwrite an existing
      attendance row when running the bulk fill — explicit 出席/缺席
      marks survive it.
- [ ] **ATT-BULK-003**: The system shall skip withdrawn students in the
      bulk fill and leave their attendance history untouched.
- [ ] **ATT-BULK-004**: The system shall default the bulk fill's quarter
      to the current quarter and validate the date against that quarter's
      sessions before inserting anything.

## Read Model

- [ ] **ATT-READ-001**: The system shall return, per quarter: the sorted
      session dates and, per active student, aligned marks
      (`"yes" | "no" | "none"`) plus identity fields (name, fellowship,
      group, photo, season `missed`).
- [ ] **ATT-READ-002**: The system shall exclude withdrawn students from
      the attendance sheet while keeping their rows in the database.

## UI

- [ ] **ATT-UI-001**: The system shall show the 出席 tab to instructors
      only, between 名單 and 課堂安排.
- [ ] **ATT-UI-002**: The system shall open the sheet on the default date:
      today when it is a class day, else the next upcoming class date,
      else the last class date of the season.
- [ ] **ATT-UI-003**: Where the instructor taps the currently active
      mark, the system shall un-record it (back to 未記錄); tapping the
      other mark flips it.
- [ ] **ATT-UI-004**: The system shall disable 「未記錄全部出席」 while
      every active student of the selected date is recorded, and state on
      the sheet that the bulk fill does not touch recorded marks.
- [ ] **ATT-UI-005**: The system shall surface per-date tallies (已記錄
      X/Y · 出席 A · 缺席 B), the season 缺課 count per student, and an
      `role="alert"` error banner for rejected writes.
- [ ] **ATT-UI-006**: The system shall open the attendance sheet grouped
      by 小組 (the students' actual `groupName` values, zh-Hant sort,
      unnamed students under 未分組), with each group visually
      separated. 按名單 remains available as a layout toggle.

## Verification

- [ ] **ATT-TEST-001**: The E2E script `scripts/test-attendance.mjs`
      shall walk the gates, single-mark round-trip, clear-to-未記錄,
      bulk-fill semantics, and the withdrawn-student exclusion against
      the dev deployment and assert every outcome.
