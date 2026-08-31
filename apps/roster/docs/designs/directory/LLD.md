# Directory — Low-Level Design

**Created**: 2026-08-30
**HLD Link**: ../../high-level-design.md

## Overview

聯絡表 is the class contact sheet: name, fellowship, group, quarter,
email. The scoping rule is the whole feature — **students see the current
season only; instructors see the full archive with a quarter filter.**
Enforcement is in the `directory` query, not the component.

## Query

`students:directory` (auth required):

- instructor → all students, light projection, sorted by name.
- student → same projection filtered to
  `quarter === CURRENT_QUARTER`.

The light projection carries name, email, fellowship, groupName, quarter,
and photoStorageId — never attendance, never missed counts.

## UI

Instructors get the 季度 select (including 全部). Students get a fixed
season label instead of a selector and always see the current season's
rows. Rows are numbered with vermilion marginal numerals; names render in
serif with the photo-or-initial avatar.

## Edge Cases

- **Empty quarter**: 本季度尚無記錄 empty state.
- **Unregistered viewer**: an authenticated user without a current-season
  record still sees the current-season directory (they are deciding
  whether to join).

## Related Documents

- [High-Level Design](../../high-level-design.md)
- [Directory EARS](./directory-EARS.md)
