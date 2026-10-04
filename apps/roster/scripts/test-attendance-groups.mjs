// Unit walkthrough of splitByGroup — the 出席 default grouping. Asserts
// that groups come from the roster's groupName values (nothing hardcoded),
// empty names collect under 未分組, and members stay sorted. Run:
//   node --experimental-strip-types scripts/test-attendance-groups.mjs

import { splitByGroup } from "../src/attendanceGroups.ts";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const rows = [
  { name: "Hannnie", groupName: "神说什么都队" },
  { name: "毛俊燁", groupName: "蘑菇組" },
  { name: "付裕洲Joy", groupName: "三一神的組" },
  { name: "王子軒", groupName: "蘑菇組" },
  { name: "康可瑩", groupName: "  " },
  { name: "Bryant", groupName: "" },
  { name: "劉小璇", groupName: "蘑菇組" },
];

const groups = splitByGroup(rows);
const names = groups.map((g) => g.name);
check("three named groups plus 未分組", groups.length === 4, names.join(" · "));
check(
  "uses each row's groupName, not a hardcoded list",
  names.includes("蘑菇組") &&
    names.includes("三一神的組") &&
    names.includes("神说什么都队"),
);
check("未分組 is last", names[names.length - 1] === "未分組");

const leftover = groups[groups.length - 1].students.map((s) => s.name).sort();
check(
  "blank and empty groupName share 未分組",
  leftover.join(",") === "Bryant,康可瑩",
  leftover.join(","),
);

const mushroom = groups.find((g) => g.name === "蘑菇組");
check("蘑菇組 has three members", mushroom?.students.length === 3);
check(
  "a group only contains its own members",
  mushroom?.students.every((s) => s.groupName === "蘑菇組") === true,
);

const extra = splitByGroup([
  { name: "新組員", groupName: "新來的組" },
  { name: "舊組員", groupName: "蘑菇組" },
]);
check(
  "a newly appearing groupName becomes its own section",
  extra.some((g) => g.name === "新來的組") && extra.length === 2,
);
check(
  "no leftover 未分組 when every row has a name",
  extra.every((g) => g.name !== "未分組"),
);

const alpha = splitByGroup([
  { name: "Zoe", groupName: "STAR" },
  { name: "Ann", groupName: "STAR" },
  { name: "Mia", groupName: "STAR" },
]);
check(
  "members sort by name inside a group",
  alpha[0]?.students.map((s) => s.name).join(",") === "Ann,Mia,Zoe",
);

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall grouping checks passed");
