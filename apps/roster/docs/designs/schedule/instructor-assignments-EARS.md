# Instructor Assignments — EARS

**Parent LLD**: ./LLD.md

## Season Scope

- [x] **SCH-ADM-001**: The system shall render only the current season's
      sessions in 課堂安排, for instructors and students alike.
- [x] **SCH-ADM-002**: The system shall provide no UI to add or delete
      class dates — dates are fixed at five per season and the first
      (orientation) never carries assignments.
- [x] **SCH-ADM-003**: The instructor view shall organize the season by
      group: one table per group, weeks as rows, 主領/觀察 as columns,
      names in the cells.

## Assignment Editing

- [x] **SCH-ADM-010**: When an instructor adds a member to 主領 or 觀察
      for a week, the system shall persist the assignment immediately and
      reflect it for all viewers in real time.
- [x] **SCH-ADM-011**: When an instructor removes an assignment chip, the
      system shall update the session for all viewers in real time.
- [x] **SCH-ADM-012**: The system shall exclude a candidate from a week's
      add-list when they are already assigned to that week in either role.

## Derived Views

- [x] **SCH-DER-001**: The 主領日期 view shall show each student with the
      dates on which they lead, derived from the sessions table.
- [x] **SCH-DER-002**: The 觀察日期 view shall show each student with the
      dates on which they observe, derived from the sessions table.

## Related Documents

- [Schedule LLD](./LLD.md)
