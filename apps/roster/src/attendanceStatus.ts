// Derived withdrawal from attendance (2026秋季 onward).
//
// Manual withdrawal (`withdrawnAt` set) still wins. From 2026秋季 on, a
// student is also withdrawn when they have missed any two class dates of
// their quarter. A miss is an explicit 缺席, or a session date strictly
// before today in America/New_York with no attendance row. Status is
// always computed from the rows — never stored as a flag that can go
// stale. See docs/designs/withdrawal/LLD.md.

export const ABSENCE_RULE_START_QUARTER = "2026秋季";
export const MISS_WITHDRAWAL_THRESHOLD = 2;
export const CLASS_TIME_ZONE = "America/New_York";

export const SITTING_IN_ERROR = "已依缺課政策視為退出，旁聽不記錄出席";
export const MANUAL_WITHDRAWN_ATTENDANCE_ERROR =
  "已退出本季課程，無法更動出席紀錄";
export const FUTURE_BULK_ERROR = "不能為尚未到來的課堂批次填寫出席";

export type WithdrawalCause = "manual" | "absences";

export type AttendanceMark = {
  date: string;
  attended: boolean;
};

export type WithdrawalStatus = {
  withdrawn: boolean;
  cause: WithdrawalCause | null;
  /** YYYY-MM-DD of the 2nd miss, when cause is absences. */
  triggerDate: string | null;
  missedDates: string[];
  missedCount: number;
};

export type WithdrawalInput = {
  withdrawnAt?: number;
  quarter?: string | null;
  sessionDates: readonly string[];
  attendance: readonly AttendanceMark[];
  todayNy: string;
};

// YYYY-MM-DD in America/New_York. Queries must not call this with
// Date.now() if they need to re-run when the calendar day rolls; they
// read the `appMeta` todayNy row that the hourly job writes. Mutations
// and this helper itself are fine with a clock reading.
export function nyDateFromMs(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLASS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("failed to format America/New_York date");
  }
  return `${year}-${month}-${day}`;
}

type ParsedQuarter = { year: number; season: 0 | 1 };

function parseQuarter(quarter: string): ParsedQuarter | null {
  const match = quarter.trim().match(/^(\d{4})\s*(春季|秋季)$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    season: match[2] === "春季" ? 0 : 1,
  };
}

// True for 2026秋季 and every later quarter (2027春季, 2027秋季, …).
export function quarterAppliesAbsenceRule(
  quarter: string | undefined | null,
): boolean {
  if (!quarter) return false;
  const parsed = parseQuarter(quarter);
  const start = parseQuarter(ABSENCE_RULE_START_QUARTER);
  if (!parsed || !start) return false;
  return (
    parsed.year > start.year ||
    (parsed.year === start.year && parsed.season >= start.season)
  );
}

function markByDate(
  attendance: readonly AttendanceMark[],
  sessionDates: ReadonlySet<string>,
): Map<string, boolean> {
  const marks = new Map<string, boolean>();
  for (const row of attendance) {
    // Ignore rows for deleted sessions / other quarters: the caller
    // passes this quarter's session dates, and we drop anything else.
    if (!sessionDates.has(row.date)) continue;
    marks.set(row.date, row.attended);
  }
  return marks;
}

// Session dates of this quarter that count as missed against `todayNy`.
export function missedSessionDates(args: {
  sessionDates: readonly string[];
  attendance: readonly AttendanceMark[];
  todayNy: string;
}): string[] {
  const sessionSet = new Set(args.sessionDates);
  const marks = markByDate(args.attendance, sessionSet);
  return [...args.sessionDates]
    .filter((date) => {
      const attended = marks.get(date);
      if (attended === true) return false;
      if (attended === false) return true;
      return date < args.todayNy;
    })
    .sort();
}

export function withdrawalStatus(args: WithdrawalInput): WithdrawalStatus {
  const missedDates = quarterAppliesAbsenceRule(args.quarter)
    ? missedSessionDates(args)
    : [];
  if (args.withdrawnAt !== undefined) {
    return {
      withdrawn: true,
      cause: "manual",
      triggerDate: null,
      missedDates,
      missedCount: missedDates.length,
    };
  }
  if (!quarterAppliesAbsenceRule(args.quarter)) {
    return {
      withdrawn: false,
      cause: null,
      triggerDate: null,
      missedDates: [],
      missedCount: 0,
    };
  }
  const withdrawn = missedDates.length >= MISS_WITHDRAWAL_THRESHOLD;
  return {
    withdrawn,
    cause: withdrawn ? "absences" : null,
    triggerDate: withdrawn
      ? missedDates[MISS_WITHDRAWAL_THRESHOLD - 1]
      : null,
    missedDates,
    missedCount: missedDates.length,
  };
}

// Sitting-in after the 2nd miss must never be recorded as 出席. Corrections
// on or before the 2nd miss date are allowed (they can restore active).
export function canRecordPresent(
  args: WithdrawalInput & { date: string },
): boolean {
  if (args.withdrawnAt !== undefined) return false;
  if (!quarterAppliesAbsenceRule(args.quarter)) return true;
  const prior = missedSessionDates({
    sessionDates: args.sessionDates.filter((d) => d < args.date),
    attendance: args.attendance,
    todayNy: args.todayNy,
  });
  return prior.length < MISS_WITHDRAWAL_THRESHOLD;
}

export function isLockedSittingInDate(
  status: WithdrawalStatus,
  date: string,
): boolean {
  return (
    status.cause === "absences" &&
    status.triggerDate !== null &&
    date > status.triggerDate
  );
}
