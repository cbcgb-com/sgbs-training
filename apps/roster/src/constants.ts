// Shared option lists — mirrored from the Airtable 小组查经训练主日学 base
// schema (appPjFf1hVqSChSyo). Used by both the Convex functions and the UI.

// "2020 春季" carries a space in the original data — kept as-is.
export const QUARTERS = [
  "2015秋季", "2016秋季", "2017春季", "2017秋季", "2018春季", "2018秋季",
  "2019春季", "2019秋季", "2020 春季", "2020秋季", "2021春季", "2021秋季",
  "2022春季", "2022秋季", "2023春季", "2023秋季", "2024春季", "2024秋季",
  "2025春季", "2025秋季", "2026春季", "2026秋季",
] as const;

// The newest quarter — what the 本季度 view and new registrations use.
export const CURRENT_QUARTER = "2026秋季";

// The five class dates of the current season (Sundays, 2026-09-20
// onward). The sessions table is the runtime source of truth; this
// list seeds it and anchors the demo data.
export const CURRENT_QUARTER_SESSION_DATES = [
  "2026-09-20",
  "2026-09-27",
  "2026-10-04",
  "2026-10-11",
  "2026-10-18",
] as const;

export const FELLOWSHIPS = [
  "樂河團契",
  "學生團契（研究生）",
  "學生團契（本科生）",
  "MIT團契（學生組）",
  "MIT團契（工作組之一）",
  "Longwood 團契",
  "Malden 團契",
  "其他",
] as const;

export const BAPTISM_TIMES = ["少於1年", "1到5年", "超過5年"] as const;

export const EXPERIENCES = ["沒帶過", "帶過，1到5次", "帶過，多於5次"] as const;

export const GENDERS = ["女", "男"] as const;
