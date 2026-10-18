# Instructor Assignments — EARS

**Parent LLD**: ./LLD.md

## Season Scope

- [x] **SCH-ADM-001**: The system shall render only the current season's
      sessions in 課堂安排, for instructors and students alike.
- [x] **SCH-ADM-002**: The system shall provide no UI to add or delete
      class dates — dates are fixed at five per season and lesson 1
      never carries assignments (主領/觀察 start at lesson 2).
- [x] **SCH-ADM-003**: The instructor view shall organize the season by
      group: one table per group, weeks as rows, 主領/觀察 as columns,
      names in the cells.
- [x] **SCH-ADM-004**: The instructor 課堂安排 page shall offer a
      按小組 / 按週次 layout toggle, defaulting to 按小組 and remembering
      the instructor's choice across visits.
- [x] **SCH-ADM-005**: The system shall render a 按週次 layout — one
      section per class date, groups as rows, 小組/主領/觀察 as columns —
      reading and writing the same session documents as the 按小組
      layout, so an assignment edited in one view is immediately
      visible in the other.

## Assignment Editing

- [x] **SCH-ADM-010**: When an instructor adds a member to 主領 or 觀察
      for a week, the system shall persist the assignment immediately and
      reflect it for all viewers in real time.
- [x] **SCH-ADM-011**: When an instructor removes an assignment chip, the
      system shall update the session for all viewers in real time.
- [x] **SCH-ADM-012**: The system shall exclude a candidate from a week's
      add-list when they are already assigned to that week in either role.
- [x] **SCH-ADM-013**: If an assignment write includes a withdrawn
      student, then the system shall reject it with a named error, so the
      withdrawal sweep cannot be undone.

## Derived Views

- [x] **SCH-DER-001**: The 主領日期 view shall show each student with the
      dates on which they lead, derived from the sessions table.
- [x] **SCH-DER-002**: The 觀察日期 view shall show each student with the
      dates on which they observe, derived from the sessions table.

## Coverage

- [x] **SCH-ADM-020**: Where a named group has more than one 主領 on a
      lesson-2+ week, 課堂安排 shall flag 需要調整 with that reason, and
      a write that would leave two 主領 shall be rejected.
- [x] **SCH-ADM-021**: Where a named group has no 觀察 on a lesson-2+
      week, 課堂安排 shall flag 需要調整; missing 觀察 does not block
      the save. One or more 觀察 is allowed.
- [x] **SCH-ADM-022**: Late joiners (including through a merge) shall
      show an observe-twice hint that does not block 主領 assignment.
- [x] **SCH-ADM-023**: Where a named group has no 主領 on a lesson-2+
      week, 課堂安排 shall flag 需要調整; missing 主領 does not block
      the save.

## Related Documents

- [Schedule LLD](./LLD.md)
