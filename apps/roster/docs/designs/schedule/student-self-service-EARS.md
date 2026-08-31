# Student Self-Service — EARS

**Parent LLD**: ./LLD.md

## Visibility

- [x] **SCH-SELF-001**: While signed in as a registered student, the system
      shall render 課堂安排 scoped to the student's own group's people
      only — other groups' members and assignments shall not appear.
- [x] **SCH-SELF-002**: While a signed-in student is not registered for
      the current quarter, the system shall show 本季度尚未登記 with a
      前往註冊 action instead of the schedule.

## Self-Assignment

- [x] **SCH-SELF-010**: When a student clicks 我來主領 for a week, the
      system shall add the student's own name as 主領 for that week.
- [x] **SCH-SELF-011**: When a student clicks 我來觀察 for a week, the
      system shall add the student's own name as 觀察 for that week.
- [x] **SCH-SELF-012**: When a student takes one role for a week, the
      system shall remove them from the other role of that same week (one
      role per week).
- [x] **SCH-SELF-013**: The system shall allow a student to remove only
      their own name from a week; other people's names shall render
      without controls.

## Constraints

- [x] **SCH-SELF-020**: If an unregistered student attempts a schedule
      self-service action, then the system shall reject it with
      請先註冊本季課程.
- [x] **SCH-SELF-021**: The system shall scope self-service additions to
      the current season's sessions only.
- [x] **SCH-SELF-022**: The system shall propagate self-service changes to
      every open viewer in real time.

## Related Documents

- [Schedule LLD](./LLD.md)
