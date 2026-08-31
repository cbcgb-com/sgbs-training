# Roster Views — Low-Level Design

**Created**: 2026-08-30
**HLD Link**: ../../high-level-design.md

## Overview

名單 is the instructor's full-roster browser: the 12 original Airtable
views reimplemented as gated queries over one `students` table. Students
never reach this surface. The tab opens on 本季度 (current season), not
全體.

## View Inventory

| View | Query | Rule |
| ---- | ----- | ---- |
| Master (全體) | students:all | everyone |
| 本季度 (default) | students:byQuarter | quarter = current |
| 帶領經驗 | students:withExperience | leadingExperience ≠ 沒帶過 |
| 主領日期 | students:leaders | derived: leads ≥ 1 session |
| 觀察日期 | students:observers | derived: observes ≥ 1 session |
| 功課 | students:withHomework | homeworkCount > 0 |
| Missed 缺課 | students:withMissed | missed > 0 |
| 團契/受洗/性別/季度 看板 | students:grouped | grouped by select field |

主領日期 and 觀察日期 are **derived at query time** by inverting the
sessions table — no stored copy to drift. 缺課 shows the attendance beat
marks (五堂 as filled/hollow/dash marks) with a legend.

## Table Conventions

- Vermilion marginal numerals (verse-style row numbers)
- 2px ink rule under headers + hairline (`.th-double` device)
- Serif bold names with photo-or-initial avatars
- Right-aligned marginal metadata columns
- 共 N 條記錄 footnote
- zh-Hant name sort order

## Note on Fidelity

Airtable's API does not expose view configurations (filters, sorts,
hidden columns), so each view was reimplemented from its name and
semantics. If the live Airtable view differs, the fix is in
`convex/students.ts` — the EARS above describe current intent, not the
Airtable originals.

## Related Documents

- [High-Level Design](../../high-level-design.md)
- [Roster Views EARS](./roster-views-EARS.md)
