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
| Master (全體) | students:all | everyone, **including withdrawn** (已退出 badge) |
| 本季度 (default) | students:byQuarter | quarter = current, excluding withdrawn |
| 帶領經驗 | students:withExperience | leadingExperience ≠ 沒帶過 |
| 主領日期 | students:leaders | derived: leads ≥ 1 session |
| 觀察日期 | students:observers | derived: observes ≥ 1 session |
| Missed 缺課 | students:withMissed | missed > 0 |
| 已退出 | students:withdrawn | withdrawn only (soft state; filterable) |
| 團契/受洗/性別/季度 看板 | students:grouped | grouped by select field |

主領日期 and 觀察日期 are **derived at query time** by inverting the
sessions table — no stored copy to drift. 缺課 shows the attendance beat
marks (五堂 as filled/hollow/dash marks) with a legend.

Withdrawal (退出報名) is soft state on the student row (`withdrawnAt`), so
Master and the derived history views keep withdrawn students while every
current-quarter view filters them out; the 已退出 view is their dedicated
surface. See [Withdrawal LLD](../withdrawal/LLD.md).

## Table Conventions

- Vermilion marginal numerals (verse-style row numbers)
- 2px ink rule under headers + hairline (`.th-double` device)
- Serif bold names with photo-or-initial avatars
- Right-aligned marginal metadata columns
- 共 N 條記錄 footnote
- zh-Hant name sort order

## Strikeout treatment (缺課 ≥ 2)

A student with 本季缺課 ≥ 2 (the replicated `missed` field) reads as
**no longer attending, but was part of the group**: the name and
portrait render faded (`opacity-40`) with a dotted line through the
name, plus a hover hint (「N 本季已缺課 X 堂」). They stay listed
everywhere — the treatment is presentation only (`src/strikeout.ts`),
never a filter. Applied on all four instructor surfaces: 分組 member
rows, 名單 card + table layouts (all sub-views whose rows carry
`missed`), 出席 rows (the 出席／缺席 buttons stay fully usable), and
課堂安排 member + 主領／觀察 chips in both layouts. Views whose query
projects rows manually (主領日期, 觀察日期, 已退出) include `missed` in
the projection so the treatment reads identically there.

## Note on Fidelity

Airtable's API does not expose view configurations (filters, sorts,
hidden columns), so each view was reimplemented from its name and
semantics. If the live Airtable view differs, the fix is in
`convex/students.ts` — the EARS above describe current intent, not the
Airtable originals.

## Related Documents

- [High-Level Design](../../high-level-design.md)
- [Roster Views EARS](./roster-views-EARS.md)
