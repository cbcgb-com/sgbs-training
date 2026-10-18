// Unit walkthrough of the per-group per-week 主領/觀察 rule.
// sessions.leaderIds is a flat class list; a group is the subset in
// that group's member set. Run:
//   node --experimental-strip-types scripts/test-assignment-rules.mjs

import {
  TWO_LEADERS_ERROR,
  assignmentAdjustmentText,
  groupWeekAssignmentIssues,
  groupsExceedingLeaderCap,
  spliceGroupAssignments,
  twoLeadersError,
} from "../src/assignmentRules.ts";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const alice = "s_alice";
const bob = "s_bob";
const cara = "s_cara";
const dan = "s_dan";
const star = new Set([alice, bob, cara]);
const joshua = new Set([dan]);

check("save error constant", TWO_LEADERS_ERROR === "每組每堂只能有一位主領");

{
  const empty = groupWeekAssignmentIssues({
    leaderIds: [],
    observerIds: [],
    memberIds: star,
  });
  check(
    "empty lesson-2 week flags missing 主領 and 觀察",
    empty.map((i) => i.kind).join(",") === "noLeader,noObserver",
    empty.map((i) => i.kind).join(","),
  );
  check(
    "empty week label",
    assignmentAdjustmentText(empty) ===
      "需要調整：本堂還沒有主領；本堂還沒有觀察",
  );
}

{
  const ok = groupWeekAssignmentIssues({
    leaderIds: [alice, dan],
    observerIds: [bob, cara],
    memberIds: star,
  });
  check(
    "one 主領 and two 觀察 in this group is fine (dan is another group)",
    ok.length === 0,
    JSON.stringify(ok),
  );
}

{
  const twoLeaders = groupWeekAssignmentIssues({
    leaderIds: [alice, bob, dan],
    observerIds: [cara],
    memberIds: star,
  });
  check(
    "two 主領 in the same group is flagged, even if another group also leads",
    twoLeaders.length === 1 && twoLeaders[0].kind === "tooManyLeaders",
    JSON.stringify(twoLeaders),
  );
  check(
    "two-主領 label",
    assignmentAdjustmentText(twoLeaders) ===
      "需要調整：本堂有 2 位主領，請改為一位",
  );
}

{
  const noObserver = groupWeekAssignmentIssues({
    leaderIds: [alice],
    observerIds: [dan],
    memberIds: star,
  });
  check(
    "leader without a group 觀察 is flagged (other group's observer does not count)",
    noObserver.map((i) => i.kind).join(",") === "noObserver",
    JSON.stringify(noObserver),
  );
}

{
  const observersOnly = groupWeekAssignmentIssues({
    leaderIds: [dan],
    observerIds: [alice, bob],
    memberIds: star,
  });
  check(
    "觀察 without 主領 is flagged",
    observersOnly.map((i) => i.kind).join(",") === "noLeader",
    JSON.stringify(observersOnly),
  );
}

{
  const joshuaOk = groupWeekAssignmentIssues({
    leaderIds: [alice, dan],
    observerIds: [bob],
    memberIds: joshua,
  });
  check(
    "another group's extra 主領 does not flag this group",
    joshuaOk.map((i) => i.kind).join(",") === "noObserver",
    JSON.stringify(joshuaOk),
  );
}

{
  const groupOf = new Map([
    [alice, "STAR"],
    [bob, "STAR"],
    [cara, "STAR"],
    [dan, "約書亞"],
  ]);
  check(
    "two groups with one 主領 each do not exceed the cap",
    groupsExceedingLeaderCap([alice, dan], groupOf).length === 0,
  );
  check(
    "two 主領 in STAR exceed the cap; 約書亞 does not",
    groupsExceedingLeaderCap([alice, bob, dan], groupOf).join(",") === "STAR",
  );
  check(
    "ungrouped ids are ignored",
    groupsExceedingLeaderCap([alice, "s_lone"], groupOf).length === 0,
  );
  check(
    "error names the colliding group",
    twoLeadersError(["STAR"]) === "每組每堂只能有一位主領（STAR）",
  );
}

{
  const next = spliceGroupAssignments({
    leaderIds: [alice, dan],
    observerIds: [bob],
    memberIds: star,
    role: "leader",
    nextIds: [cara],
  });
  check(
    "editing STAR 主領 keeps 約書亞's 主領",
    next.leaderIds.join(",") === `${dan},${cara}` ||
      next.leaderIds.join(",") === `${dan},${cara}`,
    next.leaderIds.join(","),
  );
  check(
    "editing STAR 主領 keeps STAR's 觀察",
    next.observerIds.join(",") === bob,
  );
}

{
  const next = spliceGroupAssignments({
    leaderIds: [alice, dan],
    observerIds: [bob],
    memberIds: star,
    role: "observer",
    nextIds: [alice, cara],
  });
  check(
    "editing STAR 觀察 keeps both groups' 主領",
    next.leaderIds.includes(alice) && next.leaderIds.includes(dan),
    next.leaderIds.join(","),
  );
  check(
    "editing STAR 觀察 does not drop the other group",
    !next.observerIds.includes(dan) && next.observerIds.includes(cara),
  );
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall assignment-rule checks passed");
