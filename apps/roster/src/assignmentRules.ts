// Per-group, per-week 主領/觀察 rule. sessions.leaderIds / observerIds
// are flat arrays for the whole class that week; a group is the subset
// whose student ids sit in that group's member set. Lesson 1 has no
// assignments (callers skip it). Used by the instructor/student 課堂安排
// UI and by the assignment mutations. See
// docs/designs/group-coverage/LLD.md and docs/designs/schedule/LLD.md.

export type AssignmentIssueKind = "tooManyLeaders" | "noLeader" | "noObserver";

export type AssignmentIssue = {
  kind: AssignmentIssueKind;
  reason: string;
};

// Hard save error when a write would leave a named group with two 主領.
export const TWO_LEADERS_ERROR = "每組每堂只能有一位主領";

export function groupWeekAssignmentIssues<T extends string>(args: {
  leaderIds: readonly T[];
  observerIds: readonly T[];
  memberIds: Set<T>;
}): AssignmentIssue[] {
  const leaders = args.leaderIds.filter((id) => args.memberIds.has(id));
  const observers = args.observerIds.filter((id) => args.memberIds.has(id));
  const issues: AssignmentIssue[] = [];
  if (leaders.length > 1) {
    issues.push({
      kind: "tooManyLeaders",
      reason: `本堂有 ${leaders.length} 位主領，請改為一位`,
    });
  } else if (leaders.length === 0) {
    issues.push({ kind: "noLeader", reason: "本堂還沒有主領" });
  }
  if (observers.length === 0) {
    issues.push({ kind: "noObserver", reason: "本堂還沒有觀察" });
  }
  return issues;
}

export function assignmentAdjustmentText(
  issues: AssignmentIssue[],
): string | null {
  if (issues.length === 0) return null;
  return `需要調整：${issues.map((i) => i.reason).join("；")}`;
}

// Named groups whose resulting leaderIds contain more than one member.
// Students with no groupName are ungrouped and are not a group.
export function groupsExceedingLeaderCap<T extends string>(
  leaderIds: readonly T[],
  groupOf: Map<T, string | null | undefined>,
): string[] {
  const counts = new Map<string, number>();
  for (const id of leaderIds) {
    const name = groupOf.get(id)?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

export function twoLeadersError(groupNames: string[]): string {
  if (groupNames.length === 0) return TWO_LEADERS_ERROR;
  return `${TWO_LEADERS_ERROR}（${groupNames.join("、")}）`;
}

// Instructor 課堂安排 edits one group at a time. The session row holds
// every group's people, so a write must keep ids outside `memberIds`.
export function spliceGroupAssignments<T extends string>(args: {
  leaderIds: readonly T[];
  observerIds: readonly T[];
  memberIds: Set<T>;
  role: "leader" | "observer";
  nextIds: readonly T[];
}): { leaderIds: T[]; observerIds: T[] } {
  const outsideLeaders = args.leaderIds.filter((id) => !args.memberIds.has(id));
  const outsideObservers = args.observerIds.filter(
    (id) => !args.memberIds.has(id),
  );
  const groupLeaders = args.leaderIds.filter((id) => args.memberIds.has(id));
  const groupObservers = args.observerIds.filter((id) => args.memberIds.has(id));
  if (args.role === "leader") {
    return {
      leaderIds: [...outsideLeaders, ...args.nextIds],
      observerIds: [...outsideObservers, ...groupObservers],
    };
  }
  return {
    leaderIds: [...outsideLeaders, ...groupLeaders],
    observerIds: [...outsideObservers, ...args.nextIds],
  };
}
