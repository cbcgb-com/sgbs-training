# Group Assignment — Low-Level Design

**Created**: 2026-08-30
**HLD Link**: ../../high-level-design.md

## Overview

分組 turns group formation into a draft the instructor owns: a one-click
diversity divider proposes groups, the instructor overrides anything by
hand, and only 儲存分組 persists. Groups are named 第1組/第2組/... and are
meant to be renamed by members (or instructor) on day one.

## The Diversity Algorithm (src/groups.ts)

Pure functions, no I/O, deterministic per seed (mulberry32 PRNG).

1. **Capacities**: n people, size s → ceil(n/s) groups, sizes differ by at
   most one (11 people in 4s → 4/4/3).
2. **Scoring**: within-group diversity = sum over unordered pairs of
   differCount(a, b) — the number of attributes (fellowship, gender,
   baptism era, leading experience) where both values exist and differ.
   Missing values never count as diversity.
3. **Greedy placement**: seeded shuffle, then each student joins the group
   (with remaining capacity) where they add the most pairwise diversity.
4. **Hill-climb**: swap members across groups while any swap raises the
   total score; stop when a full pass finds no improvement (max 60).

The score rewards mixed groups; the pass cap bounds work at roughly
O(passes × groups² × size²) — trivial at church scale.

## Persistence Model

Groups are not a table. A group is the set of current-quarter students
sharing a `groupName`. Saving writes `groupName` per student (patching
only changed values; current-quarter rows only). Empty string clears the
assignment. Renaming a group patches every current-quarter member of the
old name to the new one — including students added after the group was
formed.

## Instructor Flow (GroupAssigner.tsx)

1. Load shows the saved grouping (ungrouped students in a dashed
   未分組 column).
2. 一鍵平均分組 builds a fresh draft (new seed each click); 儲存分組
   persists and clears the draft. The unsaved draft is disposable.
3. Every member chip carries a select to move them to any group — the
   manual override. Group headers are inline inputs — the rename.
4. Each group card prints a diversity summary (distinct counts per
   attribute) so the instructor can see the mix without doing the math.

## Student Flow (MyGroup.tsx)

Students see their group name, mates (photos, emails, fellowship), and
may rename the group themselves — the rename sweeps the whole group. A
student with no group sees 尚未分配 with a pointer to the instructor.

## Edge Cases

- **Re-click 一鍵平均分組**: new seed → a different valid grouping; nothing
  persists until 儲存分組.
- **Ungrouped students after a divide**: impossible — the divider places
  everyone; manual moves always land someone in a named group.
- **Rename collision**: two groups may not merge by renaming onto an
  existing name; the instructor moves members instead.

## Related Documents

- [High-Level Design](../../high-level-design.md)
- [Divider EARS](./divider-EARS.md)
- [Group Rename EARS](./group-rename-EARS.md)
