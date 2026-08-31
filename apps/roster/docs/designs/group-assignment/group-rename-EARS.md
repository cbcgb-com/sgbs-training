# Group Rename — EARS

**Parent LLD**: ./LLD.md

## Instructor Rename (GroupAssigner inline edit)

- [x] **GRP-REN-001**: When an instructor renames a saved group, the
      system shall update the groupName of every current-quarter member of
      that group, including students added after the rename.
- [x] **GRP-REN-002**: When an instructor renames an unsaved draft column,
      the system shall rename only the draft until 儲存分組.

## Student Rename (MyGroup)

- [x] **GRP-REN-010**: While viewing 我的組, any member of the group shall
      be able to click the group name and edit it.
- [x] **GRP-REN-011**: When a member saves a new group name, the system
      shall sweep the new name across every current-quarter member of the
      group in real time.
- [x] **GRP-REN-012**: If the new name is empty, then the system shall
      reject the rename with 組名不可空白.
- [x] **GRP-REN-013**: If the new name exceeds twenty characters, then the
      system shall reject it with 組名請控制在二十字以內.
- [x] **GRP-REN-014**: When the rename succeeds, the system shall show the
      new name to every member immediately (real-time sync).

## Related Documents

- [Group Assignment LLD](./LLD.md)
