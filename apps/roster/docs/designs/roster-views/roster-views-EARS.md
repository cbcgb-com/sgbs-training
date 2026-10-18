# Roster Views — EARS

**Parent LLD**: ./LLD.md

## Defaults

- [x] **ROSTER-DEF-001**: The system shall open 名單 on the 本季度 view
      (current season), not 全體.

## Grid Views

- [x] **ROSTER-GRID-001**: The Master view shall show every student with
      name, fellowship, gender, email, quarter, group, leading
      experience, and missed count.
- [x] **ROSTER-GRID-002**: The 本季度 view shall show only students whose
      quarter equals the current quarter.
- [x] **ROSTER-GRID-003**: The 帶領經驗 view shall show only students with
      actual leading experience (帶過…).
- [x] **ROSTER-GRID-004**: The 主領日期 view shall show each student who
      leads at least one session, with their leading dates derived from
      the sessions table.
- [x] **ROSTER-GRID-005**: The 觀察日期 view shall show each student who
      observes at least one session, with their observing dates.
- [x] **ROSTER-GRID-007**: The 缺課 view shall show the five class marks
      (attended / absent / unrecorded) per student with a legend, and only
      students with missed > 0.
- [x] **ROSTER-GRID-008**: The 本季度 view shall exclude withdrawn
      students and offer a 標記退出 control per active row.
- [x] **ROSTER-GRID-009**: The 已退出 view shall list withdrawn students
      with quarter, reason, and withdrawal date, filterable by quarter, and
      offer 復原 (reactivate) per row.
- [x] **ROSTER-GRID-010**: The Master view shall keep withdrawn students
      with a 已退出 badge so history survives.

## Strikeout treatment (retired)

- [x] **ROSTER-STRK-001**: From 2026秋季, two misses withdraw the student
      (derived status). They leave active lists (本季度, 分組, 課堂安排)
      and appear on 已退出 / 已退出（缺課） instead of a strikeout on an
      active row. `src/strikeout.ts` is retired.
- [x] **ROSTER-STRK-002**: The miss threshold remains 2. Pre-2026秋季
      quarters are unchanged (flag-only withdrawal; no derived two-miss
      rule).

## Kanban Views

- [x] **ROSTER-KAN-001**: The system shall provide kanban boards grouping
      all students by 團契, 受洗時間, 性別, and 參與訓練的季度, each card
      showing name and email, sorted by group size.

## Table Conventions

- [x] **ROSTER-TAB-001**: The system shall sort grid rows by name in
      zh-Hant collation and number rows with marginal vermilion numerals.
- [x] **ROSTER-TAB-002**: The system shall show a live 共 N 條記錄 count
      under every table.

## Related Documents

- [Roster Views LLD](./LLD.md)
