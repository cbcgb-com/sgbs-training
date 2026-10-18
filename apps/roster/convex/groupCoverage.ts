// Instructor follow-up when a current-quarter group drops below 3
// active members. Banner + merge live here; the withdrawal sweep in
// attendanceStatus.ts only records a notice and schedules email.
// See docs/designs/group-coverage/LLD.md.

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { CURRENT_QUARTER } from "../src/constants";
import {
  countNamedGroups,
  proposeMergeTarget,
  remainingSessionDates,
  stripMemberAssignments,
  understaffedGroups,
} from "../src/groupCoverage";
import {
  filterActiveStudents,
  readTodayNy,
} from "./attendanceStatus";
import { requireInstructor } from "./students";

type Ctx = QueryCtx | MutationCtx;

async function currentQuarterActive(ctx: Ctx): Promise<Doc<"students">[]> {
  return (
    await filterActiveStudents(ctx, await ctx.db.query("students").collect())
  ).filter((s) => s.quarter === CURRENT_QUARTER);
}

async function openNotice(
  ctx: Ctx,
  groupName: string,
): Promise<Doc<"groupCoverageNotices"> | null> {
  const rows = await ctx.db
    .query("groupCoverageNotices")
    .withIndex("by_quarter_group", (q) =>
      q.eq("quarter", CURRENT_QUARTER).eq("groupName", groupName),
    )
    .collect();
  return rows.find((r) => r.resolvedAt === undefined) ?? null;
}

export async function resolveOpenNotice(
  ctx: MutationCtx,
  groupName: string,
): Promise<void> {
  const open = await openNotice(ctx, groupName);
  if (open) await ctx.db.patch(open._id, { resolvedAt: Date.now() });
}

export const markNoticeEmailed = internalMutation({
  args: {
    quarter: v.string(),
    groupName: v.string(),
  },
  handler: async (ctx, { quarter, groupName }) => {
    const rows = await ctx.db
      .query("groupCoverageNotices")
      .withIndex("by_quarter_group", (q) =>
        q.eq("quarter", quarter).eq("groupName", groupName),
      )
      .collect();
    const open = rows.find((r) => r.resolvedAt === undefined);
    if (!open || open.emailedAt !== undefined) return null;
    await ctx.db.patch(open._id, { emailedAt: Date.now() });
    return open._id;
  },
});

export const pendingNotices = internalQuery({
  handler: async (ctx) => {
    const rows = await ctx.db.query("groupCoverageNotices").collect();
    return rows.filter(
      (r) =>
        r.quarter === CURRENT_QUARTER &&
        r.resolvedAt === undefined &&
        r.emailedAt === undefined,
    );
  },
});

// Instructor banner + merge picker. Live counts, not the notice table.
export const alerts = query({
  handler: async (ctx) => {
    await requireInstructor(ctx);
    const active = await currentQuarterActive(ctx);
    const counts = countNamedGroups(active);
    const under = understaffedGroups(counts);
    return under.map((g) => {
      const members = active
        .filter((s) => s.groupName === g.groupName)
        .map((s) => ({ _id: s._id, name: s.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
      const otherGroups = [...counts.entries()]
        .filter(([name, n]) => name !== g.groupName && n > 0)
        .map(([groupName, memberCount]) => ({ groupName, memberCount }))
        .sort((a, b) => a.groupName.localeCompare(b.groupName, "zh-Hant"));
      return {
        groupName: g.groupName,
        memberCount: g.memberCount,
        members,
        proposedTarget: proposeMergeTarget(g.groupName, counts),
        otherGroups,
      };
    });
  },
});

export const lateJoiners = query({
  handler: async (ctx) => {
    await requireInstructor(ctx);
    const rows = await ctx.db
      .query("groupLateJoiners")
      .collect();
    return rows
      .filter((r) => r.quarter === CURRENT_QUARTER)
      .map((r) => ({
        studentId: r.studentId,
        groupName: r.groupName,
        sourceGroup: r.sourceGroup ?? null,
      }));
  },
});

// Instructor-confirmed merge for the rest of the quarter. Members of
// `from` move to `to`; remaining-week 主領/觀察 for the combined group
// are cleared so the new group re-picks. Late joiners (the moved
// members) get an observe-twice hint, not a hard block.
export const mergeGroups = mutation({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, { from, to }) => {
    await requireInstructor(ctx);
    const source = from.trim();
    const target = to.trim();
    if (!source) throw new Error("請選擇要合併的小組");
    if (!target) throw new Error("請選擇目標小組");
    if (source === target) throw new Error("不能合併到同一組");

    const active = await currentQuarterActive(ctx);
    const sourceMembers = active.filter((s) => s.groupName === source);
    const targetMembers = active.filter((s) => s.groupName === target);
    if (sourceMembers.length === 0) throw new Error(`找不到小組「${source}」`);
    if (targetMembers.length === 0) throw new Error(`找不到小組「${target}」`);

    const now = Date.now();
    for (const member of sourceMembers) {
      await ctx.db.patch(member._id, { groupName: target });
      const existing = (
        await ctx.db
          .query("groupLateJoiners")
          .withIndex("by_quarter_student", (q) =>
            q.eq("quarter", CURRENT_QUARTER).eq("studentId", member._id),
          )
          .collect()
      )[0];
      if (existing) {
        await ctx.db.patch(existing._id, {
          groupName: target,
          joinedAt: now,
          sourceGroup: source,
        });
      } else {
        await ctx.db.insert("groupLateJoiners", {
          studentId: member._id,
          quarter: CURRENT_QUARTER,
          groupName: target,
          joinedAt: now,
          sourceGroup: source,
        });
      }
    }

    const combinedIds = new Set<Id<"students">>([
      ...sourceMembers.map((s) => s._id),
      ...targetMembers.map((s) => s._id),
    ]);
    const todayNy = await readTodayNy(ctx);
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_quarter", (q) => q.eq("quarter", CURRENT_QUARTER))
      .collect();
    const remaining = remainingSessionDates(
      sessions.map((s) => s.date),
      todayNy,
    );
    let clearedSessions = 0;
    for (const session of sessions) {
      const next = stripMemberAssignments(
        session,
        combinedIds,
        remaining,
      );
      if (!next) continue;
      await ctx.db.patch(session._id, {
        leaderIds: next.leaderIds,
        observerIds: next.observerIds,
      });
      clearedSessions++;
    }

    await resolveOpenNotice(ctx, source);
    const stillActive = (await currentQuarterActive(ctx)).filter(
      (s) => s.groupName === target,
    );
    if (stillActive.length >= 3) await resolveOpenNotice(ctx, target);

    return {
      moved: sourceMembers.length,
      target,
      targetCount: stillActive.length,
      clearedSessions,
    };
  },
});
