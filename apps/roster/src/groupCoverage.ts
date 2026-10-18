// Pure helpers for small-group coverage: a current-quarter group with
// fewer than 3 active members needs an instructor-confirmed merge.
// Convex mutations and the UI share this file so the banner copy, the
// proposed target, remaining-week stripping, and 主領 collision checks
// cannot drift. See docs/designs/group-coverage/LLD.md.

export const MIN_ACTIVE_MEMBERS = 3;

export type GroupCount = {
  groupName: string;
  memberCount: number;
};

export function countNamedGroups(
  students: { groupName?: string | null }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const student of students) {
    const name = student.groupName?.trim();
    if (!name) continue;
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return map;
}

export function understaffedGroups(
  counts: Map<string, number>,
): GroupCount[] {
  return [...counts.entries()]
    .filter(([, n]) => n > 0 && n < MIN_ACTIVE_MEMBERS)
    .map(([groupName, memberCount]) => ({ groupName, memberCount }))
    .sort((a, b) => a.groupName.localeCompare(b.groupName, "zh-Hant"));
}

// Smallest other named group (then zh-Hant name). Empty / self excluded.
export function proposeMergeTarget(
  source: string,
  counts: Map<string, number>,
): string | null {
  const others = [...counts.entries()].filter(
    ([name, n]) => name !== source && n > 0,
  );
  if (others.length === 0) return null;
  others.sort((a, b) => {
    if (a[1] !== b[1]) return a[1] - b[1];
    return a[0].localeCompare(b[0], "zh-Hant");
  });
  return others[0][0];
}

export function coverageBannerText(
  groupName: string,
  memberCount: number,
): string {
  return `${groupName} 只剩 ${memberCount} 人，需要合併`;
}

export function remainingSessionDates(
  dates: string[],
  todayNy: string,
): string[] {
  return dates.filter((d) => d >= todayNy).sort();
}

export function stripMemberAssignments<T extends string>(
  session: { date: string; leaderIds: T[]; observerIds: T[] },
  memberIds: Set<T>,
  remainingDates: string[],
): { leaderIds: T[]; observerIds: T[] } | null {
  if (!remainingDates.includes(session.date)) return null;
  const leaderIds = session.leaderIds.filter((id) => !memberIds.has(id));
  const observerIds = session.observerIds.filter((id) => !memberIds.has(id));
  if (
    leaderIds.length === session.leaderIds.length &&
    observerIds.length === session.observerIds.length
  ) {
    return null;
  }
  return { leaderIds, observerIds };
}

export function leaderCollisionsForGroup<T extends string>(
  sessions: { date: string; leaderIds: T[] }[],
  memberIds: Set<T>,
): { date: string; leaderIds: T[] }[] {
  const out: { date: string; leaderIds: T[] }[] = [];
  for (const session of sessions) {
    const leaders = session.leaderIds.filter((id) => memberIds.has(id));
    if (leaders.length > 1) {
      out.push({ date: session.date, leaderIds: leaders });
    }
  }
  return out;
}
