# Group Coverage — EARS

**Parent LLD**: ./LLD.md

## Trigger

- [x] **COV-TRG-001**: After a withdrawal removes a student from a
      current-quarter group, if that group then has 1 or 2 active
      members, the system shall start the coverage follow-up.
- [x] **COV-TRG-002**: A group of exactly 3 active members shall not be
      flagged.
- [x] **COV-TRG-003**: A group with 0 remaining members shall not be
      offered as a merge source.

## Notify

- [x] **COV-NTF-001**: The instructor 名單 page shall show a banner
      naming each understaffed group and its remaining count.
- [x] **COV-NTF-002**: The instructor 課堂安排 page shall show the same
      banner.
- [x] **COV-NTF-003**: The system shall email active instructors through
      the existing Gmail SMTP path with the same copy and a link to the
      roster app.
- [x] **COV-NTF-004**: The system shall send that email at most once per
      (quarter, groupName) while the group stays understaffed.

## Merge

- [x] **COV-MRG-001**: The system shall propose the smallest other named
      group as the merge target, and allow the instructor to pick a
      different named group.
- [x] **COV-MRG-002**: The system shall not change any group's members
      until an instructor confirms the merge.
- [x] **COV-MRG-003**: After a confirmed merge, source members shall
      carry the target `groupName` for the rest of the quarter.
- [x] **COV-MRG-004**: After a confirmed merge, 主領/觀察 for the
      combined group's remaining session dates (`>= todayNy`) shall be
      cleared.

## Assignments

The 主領/觀察 rule is general (every named group, every lesson-2+
week), not merge-only. See also schedule EARS SCH-ADM-020–023.

- [x] **COV-ASN-001**: Where a group has more than one 主領 on a
      session, 課堂安排 shall flag 需要調整 with the two-leader reason.
- [x] **COV-ASN-002**: Where a group has no 觀察 on a lesson-2+ week,
      課堂安排 shall flag 需要調整; the write is not blocked.
- [x] **COV-ASN-003**: Students who joined a group through a merge shall
      see an observe-twice hint in 課堂安排 that does not block assigning
      them as 主領.
- [x] **COV-ASN-004**: A write that would leave a named group with two
      主領 shall be rejected.

## Related Documents

- [Group Coverage LLD](./LLD.md)
