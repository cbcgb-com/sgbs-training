// Split the attendance sheet into 小組 sections. Group names come from
// the roster (`groupName`); nothing is hardcoded. Empty / whitespace
// names collect under 未分組 at the end. Named groups and members sort
// with zh-Hant collation.

export type GroupableStudent = {
  name: string;
  groupName: string;
};

export function splitByGroup<T extends GroupableStudent>(
  students: T[],
): { name: string; students: T[] }[] {
  const map = new Map<string, T[]>();
  const ungrouped: T[] = [];
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, "zh-Hant");
  for (const s of students) {
    const name = s.groupName.trim();
    if (!name) {
      ungrouped.push(s);
      continue;
    }
    const members = map.get(name);
    if (members) members.push(s);
    else map.set(name, [s]);
  }
  for (const members of map.values()) members.sort(byName);
  ungrouped.sort(byName);
  const groups = [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "zh-Hant"))
    .map(([name, members]) => ({ name, students: members }));
  if (ungrouped.length > 0) groups.push({ name: "未分組", students: ungrouped });
  return groups;
}
