// Unit walkthrough of the derived two-miss withdrawal helper. No Convex.
// Run: node --experimental-strip-types scripts/test-attendance-status.mjs

import {
  ABSENCE_RULE_START_QUARTER,
  MISS_WITHDRAWAL_THRESHOLD,
  canRecordPresent,
  isLockedSittingInDate,
  missedSessionDates,
  nyDateFromMs,
  quarterAppliesAbsenceRule,
  withdrawalStatus,
} from "../src/attendanceStatus.ts";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const DATES = [
  "2026-09-20",
  "2026-09-27",
  "2026-10-04",
  "2026-10-11",
  "2026-10-18",
];
const TODAY = "2026-10-18";
const QUARTER = "2026秋季";

function status(overrides = {}) {
  return withdrawalStatus({
    quarter: QUARTER,
    sessionDates: DATES,
    attendance: [],
    todayNy: TODAY,
    ...overrides,
  });
}

function present(...dates) {
  return dates.map((date) => ({ date, attended: true }));
}
function absent(...dates) {
  return dates.map((date) => ({ date, attended: false }));
}

// ---- Quarter gating ---------------------------------------------------
check("rule starts at 2026秋季", ABSENCE_RULE_START_QUARTER === "2026秋季");
check("threshold is two misses", MISS_WITHDRAWAL_THRESHOLD === 2);
check("2026秋季 applies", quarterAppliesAbsenceRule("2026秋季") === true);
check("2027春季 applies", quarterAppliesAbsenceRule("2027春季") === true);
check("2026春季 does not apply", quarterAppliesAbsenceRule("2026春季") === false);
check("2025秋季 does not apply", quarterAppliesAbsenceRule("2025秋季") === false);
check("2020 春季 (legacy space) does not apply", quarterAppliesAbsenceRule("2020 春季") === false);
check("empty quarter does not apply", quarterAppliesAbsenceRule(undefined) === false);

// ---- Blank past date = miss; today is not counted ---------------------
{
  const missed = missedSessionDates({
    sessionDates: DATES,
    attendance: [],
    todayNy: TODAY,
  });
  check(
    "blank past date = miss",
    missed.join(",") === "2026-09-20,2026-09-27,2026-10-04,2026-10-11",
    missed.join(","),
  );
  check("today blank is not a miss", !missed.includes(TODAY));
}

{
  const s = status({
    attendance: [...present("2026-09-20", "2026-09-27", "2026-10-04"), ...absent("2026-10-11")],
  });
  check("one explicit 缺席 + today blank = still active", s.withdrawn === false);
  check("missedCount is 1 (the explicit 缺席)", s.missedCount === 1, String(s.missedCount));
}

{
  const s = status({
    attendance: absent("2026-10-18"),
  });
  check("explicit 缺席 on today IS a miss", s.missedDates.includes(TODAY));
  check(
    "today 缺席 plus four past blanks = withdrawn",
    s.withdrawn === true && s.cause === "absences",
  );
}

{
  const s = status({ todayNy: "2026-09-20", attendance: [] });
  check("on the first class day, blanks of later dates are not misses", s.missedCount === 0);
  check("first class day itself is not a miss while still today", s.withdrawn === false);
}

// ---- Two misses withdraw; correction restores -------------------------
{
  const twoMisses = status({
    attendance: [
      ...present("2026-09-20", "2026-09-27", "2026-10-18"),
      ...absent("2026-10-04", "2026-10-11"),
    ],
  });
  check("two explicit 缺席 → withdrawn by absences", twoMisses.withdrawn === true);
  check("cause is absences", twoMisses.cause === "absences");
  check("triggerDate is the 2nd miss", twoMisses.triggerDate === "2026-10-11", twoMisses.triggerDate);
}

{
  const blanks = status({
    attendance: present("2026-09-20", "2026-09-27", "2026-10-18"),
  });
  check("two past blanks → withdrawn", blanks.withdrawn === true);
  check("2nd miss is the later blank", blanks.triggerDate === "2026-10-11", blanks.triggerDate);
}

{
  const corrected = status({
    attendance: [
      ...present("2026-09-20", "2026-09-27", "2026-10-04", "2026-10-18"),
      ...absent("2026-10-11"),
    ],
  });
  check("correcting one of two misses restores active", corrected.withdrawn === false);
  check("remaining missedCount is 1", corrected.missedCount === 1);
}

{
  const mixed = status({
    attendance: [
      { date: "2026-10-04", attended: false },
      { date: "2026-10-11", attended: true },
    ],
  });
  check(
    "blank 09-20 + 缺席 10-04 = two misses (09-27 also blank)",
    mixed.missedDates[0] === "2026-09-20" && mixed.missedDates[1] === "2026-09-27",
    mixed.missedDates.join(","),
  );
}

// ---- Sitting-in: present after 2nd miss rejected; correction allowed --
{
  const attendance = [
    ...present("2026-09-20", "2026-09-27", "2026-10-18"),
    ...absent("2026-10-04", "2026-10-11"),
  ];
  const input = {
    quarter: QUARTER,
    sessionDates: DATES,
    attendance,
    todayNy: TODAY,
  };
  const st = withdrawalStatus(input);
  check(
    "sitting-in 出席 after 2nd miss is rejected",
    canRecordPresent({ ...input, date: "2026-10-18" }) === false,
  );
  check(
    "correction 出席 on the 2nd miss date is allowed",
    canRecordPresent({ ...input, date: "2026-10-11" }) === true,
  );
  check(
    "correction 出席 on the 1st miss date is allowed",
    canRecordPresent({ ...input, date: "2026-10-04" }) === true,
  );
  check(
    "later dates lock as 旁聽不記錄",
    isLockedSittingInDate(st, "2026-10-18") === true,
  );
  check(
    "the 2nd miss date itself is not locked",
    isLockedSittingInDate(st, "2026-10-11") === false,
  );
}

{
  const input = {
    withdrawnAt: 1,
    quarter: QUARTER,
    sessionDates: DATES,
    attendance: present(...DATES),
    todayNy: TODAY,
    date: "2026-10-18",
  };
  check("manual withdrawal rejects 出席 writes", canRecordPresent(input) === false);
}

// ---- Pre-2026秋季: only withdrawnAt -----------------------------------
{
  const hist = withdrawalStatus({
    quarter: "2026春季",
    sessionDates: [
      "2026-02-22",
      "2026-03-01",
      "2026-03-08",
      "2026-03-15",
      "2026-03-22",
    ],
    attendance: [],
    todayNy: TODAY,
  });
  check("pre-2026秋季 blanks do not withdraw", hist.withdrawn === false);
  check("pre-2026秋季 missedCount stays 0 in the helper", hist.missedCount === 0);
}

{
  const hist = withdrawalStatus({
    quarter: "2025秋季",
    withdrawnAt: 1_700_000_000_000,
    sessionDates: ["2025-10-05", "2025-10-12"],
    attendance: [],
    todayNy: TODAY,
  });
  check("pre-2026秋季 withdrawnAt still withdraws", hist.withdrawn === true);
  check("pre-2026秋季 cause is manual", hist.cause === "manual");
}

{
  const both = status({
    withdrawnAt: 1,
    attendance: [
      ...present("2026-09-20", "2026-09-27", "2026-10-18"),
      ...absent("2026-10-04", "2026-10-11"),
    ],
  });
  check("withdrawnAt wins over absences (cause manual)", both.cause === "manual");
  check("manual overlay still reports missedDates", both.missedCount === 2);
}

// ---- Ignore orphan rows / other quarters ------------------------------
{
  const s = status({
    attendance: [
      { date: "2026-09-20", attended: true },
      { date: "2026-09-27", attended: true },
      { date: "2026-10-04", attended: true },
      { date: "2026-10-11", attended: true },
      { date: "2026-12-25", attended: false },
      { date: "2026-01-01", attended: false },
    ],
  });
  check("rows for dates not in the session list are ignored", s.withdrawn === false);
  check("today blank with four presents is not a miss", s.missedCount === 0);
}

// ---- Future quarter with more than five dates: still two misses -------
{
  const six = [
    "2027-09-19",
    "2027-09-26",
    "2027-10-03",
    "2027-10-10",
    "2027-10-17",
    "2027-10-24",
  ];
  const s = withdrawalStatus({
    quarter: "2027秋季",
    sessionDates: six,
    attendance: absent("2027-09-19", "2027-09-26"),
    todayNy: "2027-10-24",
  });
  check("six-date quarter still withdraws at two misses", s.withdrawn === true);
  check("triggerDate is still the 2nd miss", s.triggerDate === "2027-09-26");
  check(
    "sitting-in on a later extra date is rejected",
    canRecordPresent({
      quarter: "2027秋季",
      sessionDates: six,
      attendance: absent("2027-09-19", "2027-09-26"),
      todayNy: "2027-10-24",
      date: "2027-10-24",
    }) === false,
  );
}

// ---- nyDateFromMs -----------------------------------------------------
{
  // 2026-10-18 06:30 UTC is still 2026-10-18 02:30 EDT.
  check(
    "nyDateFromMs afternoon UTC stays on the NY date",
    nyDateFromMs(Date.UTC(2026, 9, 18, 16, 0, 0)) === "2026-10-18",
  );
  // 2026-10-19 03:30 UTC is 2026-10-18 23:30 EDT — still the 18th.
  check(
    "nyDateFromMs before midnight NY does not roll the date",
    nyDateFromMs(Date.UTC(2026, 9, 19, 3, 30, 0)) === "2026-10-18",
  );
  // 2026-10-19 04:00 UTC is 2026-10-19 00:00 EDT.
  check(
    "nyDateFromMs at midnight EDT rolls the date",
    nyDateFromMs(Date.UTC(2026, 9, 19, 4, 0, 0)) === "2026-10-19",
  );
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
