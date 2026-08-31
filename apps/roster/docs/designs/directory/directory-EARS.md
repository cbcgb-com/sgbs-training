# Directory — EARS

**Parent LLD**: ./LLD.md

## Scoping

- [x] **DIR-SCOPE-001**: While signed in as a student, the system shall
      restrict the 聯絡表 to students registered for the current season.
- [x] **DIR-SCOPE-002**: While signed in as a student, the system shall
      render a fixed current-season label instead of a quarter selector.
- [x] **DIR-SCOPE-003**: While signed in as an instructor, the system shall
      provide a quarter filter across the full archive.
- [x] **DIR-SCOPE-004**: The system shall enforce the season restriction in
      the `directory` query, not only in the component.

## Projection

- [x] **DIR-DATA-001**: The directory shall expose name, fellowship,
      group, quarter, email, and photo per student — never attendance or
      missed counts.
- [x] **DIR-DATA-002**: The system shall sort the directory by name and
      number rows with marginal numerals.

## Empty State

- [x] **DIR-EMPTY-001**: When the selected season has no students, the
      system shall render 本季度尚無記錄.

## Related Documents

- [Directory LLD](./LLD.md)
