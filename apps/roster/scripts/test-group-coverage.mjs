// Unit walkthrough of small-group coverage helpers. No Convex.
// Run: node --experimental-strip-types scripts/test-group-coverage.mjs

import {
  MIN_ACTIVE_MEMBERS,
  countNamedGroups,
  coverageBannerText,
  leaderCollisionsForGroup,
  proposeMergeTarget,
  remainingSessionDates,
  stripMemberAssignments,
  understaffedGroups,
} from "../src/groupCoverage.ts";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

check("threshold is three", MIN_ACTIVE_MEMBERS === 3);

const counts = countNamedGroups([
  { groupName: "STAR" },
  { groupName: "STAR" },
  { groupName: "STAR" },
  { groupName: "約書亞" },
  { groupName: "約書亞" },
  { groupName: "恩典" },
  { groupName: "  " },
  { groupName: "" },
  { groupName: null },
]);
check("STAR has 3", counts.get("STAR") === 3);
check("約書亞 has 2", counts.get("約書亞") === 2);
check("恩典 has 1", counts.get("恩典") === 1);
check("blank names are not groups", !counts.has("") && !counts.has("  "));

const under = understaffedGroups(counts);
check(
  "exactly 3 is not flagged",
  under.every((g) => g.groupName !== "STAR"),
);
check(
  "2 and 1 are flagged",
  under.length === 2 &&
    under.some((g) => g.groupName === "約書亞" && g.memberCount === 2) &&
    under.some((g) => g.groupName === "恩典" && g.memberCount === 1),
  under.map((g) => `${g.groupName}:${g.memberCount}`).join(","),
);

check(
  "proposed target for 約書亞 is the smallest other (恩典)",
  proposeMergeTarget("約書亞", counts) === "恩典",
);
check(
  "proposed target for 恩典 is 約書亞 (smaller than STAR)",
  proposeMergeTarget("恩典", counts) === "約書亞",
);
check(
  "banner copy",
  coverageBannerText("三一神的组", 2) === "三一神的组 只剩 2 人，需要合併",
);

const onlyOne = countNamedGroups([
  { groupName: "獨行" },
  { groupName: "獨行" },
]);
check("no target when no other group", proposeMergeTarget("獨行", onlyOne) === null);

{
  const remaining = remainingSessionDates(
    ["2026-09-20", "2026-09-27", "2026-10-04", "2026-10-11", "2026-10-18"],
    "2026-10-11",
  );
  check(
    "remaining weeks include today and later",
    remaining.join(",") === "2026-10-11,2026-10-18",
    remaining.join(","),
  );
}

{
  const alice = "s_alice";
  const bob = "s_bob";
  const cara = "s_cara";
  const sessions = [
    {
      date: "2026-10-04",
      leaderIds: [alice, bob],
      observerIds: [cara],
    },
    {
      date: "2026-10-11",
      leaderIds: [alice],
      observerIds: [bob],
    },
    {
      date: "2026-10-18",
      leaderIds: [cara],
      observerIds: [],
    },
  ];
  const members = new Set([alice, bob, cara]);
  const remaining = ["2026-10-11", "2026-10-18"];
  const past = stripMemberAssignments(sessions[0], members, remaining);
  check("past week assignments are left alone", past === null);
  const mid = stripMemberAssignments(sessions[1], members, remaining);
  check(
    "remaining week strips the merged group's 主領/觀察",
    mid !== null &&
      mid.leaderIds.length === 0 &&
      mid.observerIds.length === 0,
  );
  const other = {
    date: "2026-10-18",
    leaderIds: [cara, "s_outsider"],
    observerIds: ["s_outsider2"],
  };
  const stripped = stripMemberAssignments(other, members, remaining);
  check(
    "other groups' remaining-week assignments stay",
    stripped !== null &&
      stripped.leaderIds.join(",") === "s_outsider" &&
      stripped.observerIds.join(",") === "s_outsider2",
  );

  const collisions = leaderCollisionsForGroup(sessions, new Set([alice, bob]));
  check(
    "two 主領 from the same group on one date is a collision",
    collisions.length === 1 && collisions[0].date === "2026-10-04",
    JSON.stringify(collisions),
  );
  check(
    "one 主領 is not a collision",
    leaderCollisionsForGroup(sessions, new Set([alice, cara])).length === 0,
  );
  check(
    "two 觀察 on the same date is allowed (not a 主領 collision)",
    leaderCollisionsForGroup(
      [{ date: "2026-10-11", leaderIds: [alice] }],
      new Set([alice, bob, cara]),
    ).length === 0,
  );
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall group-coverage checks passed");
