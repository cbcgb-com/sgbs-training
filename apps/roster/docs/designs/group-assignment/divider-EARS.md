# Divider — EARS

**Parent LLD**: ./LLD.md

## One-Click Divide

- [x] **GRP-DIV-001**: When the instructor clicks 一鍵平均分組, the system
      shall divide every current-quarter student into groups of the chosen
      size, with group sizes differing by at most one.
- [x] **GRP-DIV-002**: The system shall maximize within-group diversity
      across fellowship, gender, baptism era, and leading experience,
      scoring each pair by the count of differing attributes.
- [x] **GRP-DIV-003**: The system shall treat missing attribute values as
      non-diverse (they never add to the score).
- [x] **GRP-DIV-004**: When the instructor clicks 一鍵平均分組 again, the
      system shall produce a different valid grouping (fresh seed).
- [x] **GRP-DIV-005**: The system shall show each group's diversity summary
      (distinct fellowship / gender / baptism / experience counts) so the
      instructor can judge the mix.

## Override & Persistence

- [x] **GRP-OVR-001**: The system shall keep the proposed grouping as a
      local draft until the instructor clicks 儲存分組.
- [x] **GRP-OVR-002**: The system shall allow moving any student to any
      group via a per-student control while the draft is unsaved.
- [x] **GRP-OVR-003**: When 儲存分組 is clicked, the system shall persist
      the draft as groupName on each current-quarter student and touch no
      other quarters.
- [x] **GRP-OVR-004**: Group names shall default to 第N組 and remain
      editable at any time (see Group Rename).

## Related Documents

- [Group Assignment LLD](./LLD.md)
