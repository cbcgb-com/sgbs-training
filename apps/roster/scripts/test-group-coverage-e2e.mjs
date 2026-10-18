// End-to-end walkthrough of small-group coverage against a Convex
// deployment that already has this branch's functions (preview, not
// prod). Drives instructor alerts + mergeGroups. See
// docs/designs/group-coverage/LLD.md.
//
// Prereqs:
//   preview backend seeded with demo:seedPreviewData
//   instructors:upsert wit-test-instructor@example.com
//
// Run: node scripts/test-group-coverage-e2e.mjs
//
// This script does not target production (abundant-dodo-507).

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL =
  process.env.CONVEX_URL ?? "https://rugged-oriole-958.convex.cloud";
const INSTRUCTOR = "wit-test-instructor@example.com";

if (CONVEX_URL.includes("abundant-dodo-507")) {
  throw new Error("refusing to run coverage tests against production");
}

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function tokenFor(email) {
  const anon = new ConvexHttpClient(CONVEX_URL);
  const { token } = await anon.action(api.auth.signIn, { email });
  return token;
}

const instructor = new ConvexHttpClient(CONVEX_URL);
instructor.setAuth(await tokenFor(INSTRUCTOR));

const alerts = await instructor.query(api.groupCoverage.alerts, {});
check("alerts is an array", Array.isArray(alerts));
const under = alerts.filter((a) => a.memberCount < 3);
check(
  "every alert is actually under 3",
  under.length === alerts.length,
  JSON.stringify(alerts.map((a) => `${a.groupName}:${a.memberCount}`)),
);

if (alerts.length === 0) {
  console.log("skip merge: no understaffed group on this deployment");
} else {
  const source = alerts[0];
  check(
    "banner names the group and count",
    source.groupName.length > 0 && source.memberCount >= 1,
  );
  check(
    "a proposed target is another group or null",
    source.proposedTarget === null ||
      source.otherGroups.some((g) => g.groupName === source.proposedTarget),
  );

  if (source.proposedTarget) {
    const targetBefore = source.otherGroups.find(
      (g) => g.groupName === source.proposedTarget,
    );
    const res = await instructor.mutation(api.groupCoverage.mergeGroups, {
      from: source.groupName,
      to: source.proposedTarget,
    });
    check("merge moves the source members", res.moved === source.memberCount);
    check(
      "target count is source + previous target",
      res.targetCount === source.memberCount + (targetBefore?.memberCount ?? 0),
      JSON.stringify(res),
    );

    const after = await instructor.query(api.groupCoverage.alerts, {});
    check(
      "merged-away group is no longer in the banner",
      !after.some((a) => a.groupName === source.groupName),
    );

    const late = await instructor.query(api.groupCoverage.lateJoiners, {});
    check(
      "moved members are marked late joiners",
      source.members.every((m) =>
        late.some(
          (j) => j.studentId === m._id && j.groupName === source.proposedTarget,
        ),
      ),
      JSON.stringify(late),
    );

    let studentBlocked = false;
    try {
      const student = new ConvexHttpClient(CONVEX_URL);
      student.setAuth(await tokenFor("demo1@demo.sgbs"));
      await student.mutation(api.groupCoverage.mergeGroups, {
        from: "STAR",
        to: "約書亞",
      });
    } catch (e) {
      studentBlocked = /僅限同工存取|請先/.test(String(e?.message ?? e));
    }
    check("students cannot merge groups", studentBlocked);
  }
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall group-coverage e2e checks passed");
