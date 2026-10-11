// Strikeout treatment for students who have stopped attending this
// quarter: 本季缺課 ≥ 2 renders the name and portrait faded with a
// dotted strikeout — "no longer attending, but was part of the group."
// They stay listed everywhere (分組, 名單, 出席, 課堂安排); only the
// rendering changes. The count is the replicated `missed` field on the
// student doc, maintained by recordAttendance / the backfill migration.

export const MISSED_STRIKEOUT_THRESHOLD = 2;

export function isStruckOut(missed: number | undefined | null): boolean {
  return (missed ?? 0) >= MISSED_STRIKEOUT_THRESHOLD;
}

// Faded name with a dotted line through it.
export function struckNameClass(missed: number | undefined | null): string {
  return isStruckOut(missed)
    ? "opacity-40 line-through decoration-dotted decoration-2"
    : "";
}

// Faded portrait (photo or initial seal).
export function struckPortraitClass(missed: number | undefined | null): string {
  return isStruckOut(missed) ? "opacity-40" : "";
}

// Hover/focus hint for instructors: why the name is struck out.
export function struckTitle(
  name: string,
  missed: number | undefined | null,
): string | undefined {
  return isStruckOut(missed) ? `${name} 本季已缺課 ${missed} 堂` : undefined;
}
