// Group-assignment algorithm: divide students into equal-sized groups that
// maximize within-group diversity across four attributes (fellowship,
// gender, baptism era, leading experience). Pure functions — no I/O — so the
// instructor UI can run it on a draft, let them override it by hand, and
// only persist on save.

export interface GroupableStudent {
  _id: string;
  fellowship?: string;
  gender?: string;
  baptismTime?: string;
  leadingExperience?: string;
}

const ATTRS = [
  "fellowship",
  "gender",
  "baptismTime",
  "leadingExperience",
] as const;

// How many of the four attributes differ between two students (0-4).
// Missing values never count as diversity (unknown ≠ different).
export function differCount(
  a: GroupableStudent,
  b: GroupableStudent,
): number {
  let d = 0;
  for (const k of ATTRS) {
    const av = a[k];
    const bv = b[k];
    if (av && bv && av !== bv) d++;
  }
  return d;
}

export function groupInternalScore<T extends GroupableStudent>(
  group: T[],
): number {
  let score = 0;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      score += differCount(group[i], group[j]);
    }
  }
  return score;
}

// Deterministic PRNG so a given seed reproduces the same grouping.
function mulberry32(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function computeDiverseGroups<T extends GroupableStudent>(
  students: T[],
  groupSize: number,
  seed: number = Date.now(),
): { groups: T[][]; score: number } {
  const n = students.length;
  const size = Math.max(1, groupSize);
  const numGroups = Math.max(1, Math.ceil(n / size));

  // Capacities differ by at most one (e.g. 11 people in 4s -> 3,4,4).
  const base = Math.floor(n / numGroups);
  const extras = n % numGroups;
  const capacities = Array.from({ length: numGroups }, (_, i) =>
    i < extras ? base + 1 : base,
  );

  const rand = mulberry32(seed);
  const pool = [...students];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Greedy pass: each student joins the group (with remaining capacity)
  // where they add the most within-group diversity.
  const groups: T[][] = Array.from({ length: numGroups }, () => []);
  for (const student of pool) {
    let bestGroup = 0;
    let bestGain = -1;
    for (let g = 0; g < numGroups; g++) {
      if (groups[g].length >= capacities[g]) continue;
      let gain = 0;
      for (const member of groups[g]) gain += differCount(student, member);
      if (gain > bestGain) {
        bestGain = gain;
        bestGroup = g;
      }
    }
    groups[bestGroup].push(student);
  }

  // Hill-climb: swap members between groups while any swap improves the
  // total within-group diversity. Deterministic order; stops when stable.
  const MAX_PASSES = 60;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let improved = false;
    for (let g1 = 0; g1 < numGroups; g1++) {
      for (let g2 = g1 + 1; g2 < numGroups; g2++) {
        for (let i = 0; i < groups[g1].length; i++) {
          for (let j = 0; j < groups[g2].length; j++) {
            const before =
              groupInternalScore(groups[g1]) +
              groupInternalScore(groups[g2]);
            const a = groups[g1][i];
            const b = groups[g2][j];
            groups[g1][i] = b;
            groups[g2][j] = a;
            const after =
              groupInternalScore(groups[g1]) +
              groupInternalScore(groups[g2]);
            if (after > before) {
              improved = true;
            } else {
              groups[g1][i] = a;
              groups[g2][j] = b;
            }
          }
        }
      }
    }
    if (!improved) break;
  }

  return {
    groups,
    score: groups.reduce((acc, g) => acc + groupInternalScore(g), 0),
  };
}

// Per-group diversity summary for the UI: how many distinct values each
// attribute takes inside the group (higher = more mixed).
export function groupDiversitySummary<T extends GroupableStudent>(
  group: T[],
): { fellowship: number; gender: number; baptismTime: number; leadingExperience: number } {
  const counts: Record<(typeof ATTRS)[number], number> = {
    fellowship: 0,
    gender: 0,
    baptismTime: 0,
    leadingExperience: 0,
  };
  for (const k of ATTRS) {
    counts[k] = new Set(group.map((s) => s[k]).filter(Boolean)).size;
  }
  return counts;
}
