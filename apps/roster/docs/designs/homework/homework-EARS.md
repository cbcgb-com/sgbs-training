# Homework (功課記錄) — EARS

**Parent LLD**: ./LLD.md

## Backend Gates

- [ ] **HW-GATE-001**: The homework write functions (`recordHomework`,
      `clearHomework`) shall be internal — a browser client call shall
      be rejected by the server (Could not find public function), and
      the only caller shall be the CLI/agent path (`npx convex run`).
- [ ] **HW-GATE-002**: If an unauthenticated caller reads homework
      marks, then the system shall reject the read with 請先登入.
- [ ] **HW-GATE-003**: If a signed-in non-instructor reads homework
      marks, then the system shall reject the read with 僅限同工存取.
- [ ] **HW-GATE-004**: If a homework write names a date that is not an
      active session date of the student's quarter, then the system
      shall reject it with 此日期不是該季的上課日期.
- [ ] **HW-GATE-005**: If a `type: "questions"` write names a student
      who is neither 主領 nor 觀察 for that session, then the system
      shall reject it with 查經題目僅限該週的主領或觀察.

## Agent Write (recordHomework)

- [ ] **HW-WRITE-001**: Where the agent submits one (studentId, date,
      type, done) record, the system shall store one row with the
      student's quarter, optional `sourceDocUrl`, and `recordedAt`.
- [ ] **HW-WRITE-002**: Where a row for (studentId, date, type) already
      exists, the system shall update it in place — never insert a
      duplicate — returning `"updated"`.
- [ ] **HW-WRITE-003**: When an identical record is re-submitted, the
      system shall treat it as a no-op returning `"unchanged"` and
      leave `recordedAt` untouched.
- [ ] **HW-WRITE-004**: When a row is created or changed, the system
      shall refresh `recordedAt` to the write time.

## Retraction (clearHomework)

- [ ] **HW-CLEAR-001**: Where the agent clears a recorded (studentId,
      date, type) row, the system shall delete it and return
      `"deleted"`.
- [ ] **HW-CLEAR-002**: Where the agent clears a row that was never
      recorded, the system shall treat it as a no-op and return
      `"unchanged"`.

## Agent Lookup (quarterRoster)

- [ ] **HW-LOOKUP-001**: Where the agent requests the quarter roster,
      the system shall return the active (non-withdrawn) students of
      that quarter (default: current) with `_id`, `name`, `groupName`,
      and `fellowship`.

## Read Model

- [ ] **HW-READ-001**: Where an instructor reads homework marks, the
      system shall return all rows of the quarter (default: current) as
      `{ studentId, date, type, done }`.
- [ ] **HW-READ-002**: The system shall treat a missing row as the
      third state 未記錄 — never as 未完成.

## Read UI (課堂安排 按週次)

- [ ] **HW-UI-001**: The system shall show homework marks only on the
      instructor by-week layout — the by-group layout and the student
      schedule shall render without them.
- [ ] **HW-UI-002**: The system shall render exactly three mark states
      as glyph and color: ✓ 已完成 (ink), ✗ 未完成 (vermilion), –
      未記錄 (quiet gray).
- [ ] **HW-UI-003**: The system shall show the notes mark on every
      member chip in the 組員（筆記） column and the questions mark on
      the week's 主領/觀察 chips only.
- [ ] **HW-UI-004**: Where a week has no homework rows, the system
      shall show the one-line empty state 本週尚未記錄功課 above the
      week's table.
- [ ] **HW-UI-005**: The system shall keep homework marks read-only —
      no UI element in the roster app writes homework.
