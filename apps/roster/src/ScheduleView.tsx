import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { CURRENT_QUARTER } from "./constants";
import { useTab } from "./App";

type SessionRow = {
  _id: Id<"sessions">;
  date: string;
  quarter: string;
  assistantNames: string[];
  leaders: { _id: Id<"students">; name: string }[];
  observers: { _id: Id<"students">; name: string }[];
};

type Role = "leader" | "observer";

type AssignmentUpdater = (
  session: SessionRow,
  role: Role,
  nextPeople: { _id: Id<"students">; name: string }[],
) => Promise<void>;

// Instructor layout for 課堂安排: by group (default) or by week. The
// choice persists in localStorage across visits.
type ScheduleLayout = "group" | "week";

const SCHEDULE_LAYOUTS = [
  { key: "group" as const, label: "按小組" },
  { key: "week" as const, label: "按週次" },
];

const LAYOUT_STORAGE_KEY = "sgbs-roster-schedule-layout";

function useScheduleLayout() {
  const [layout, setLayout] = useState<ScheduleLayout>(() => {
    try {
      return localStorage.getItem(LAYOUT_STORAGE_KEY) === "week"
        ? "week"
        : "group";
    } catch {
      return "group";
    }
  });

  function update(next: ScheduleLayout) {
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode) — keep the in-memory choice.
    }
  }

  return [layout, update] as const;
}

// 課堂安排: this season's five class dates. Instructors choose between
// two layouts of the same session docs — 按小組 (one table per group,
// weeks as rows) or 按週次 (one section per date, groups as rows).
// Historical quarters live in the database but are not shown.
export default function ScheduleView({ isInstructor }: { isInstructor: boolean }) {
  const allSessions = useQuery(api.students.schedule);
  const roster = useQuery(
    api.students.byQuarter,
    isInstructor ? {} : "skip",
  );
  // 功課記錄 (筆記/題目) — read-only marks written by the agent workflow
  // from the weekly Google Docs. Instructor-only like the roster read:
  // students never see peers' completion (their schedule renders below).
  const homework = useQuery(api.homework.byQuarter, isInstructor ? {} : "skip");
  const [layout, setLayout] = useScheduleLayout();

  // 功課記錄 lookup: date → (`${studentId}:${type}` → done). Absence of
  // a key is the third state — 未記錄, never conflated with 未完成.
  const hwByDate = useMemo(() => {
    const byDate = new Map<string, Map<string, boolean>>();
    for (const r of homework ?? []) {
      if (!byDate.has(r.date)) byDate.set(r.date, new Map());
      byDate.get(r.date)!.set(`${r.studentId}:${r.type}`, r.done);
    }
    return byDate;
  }, [homework]);

  const sessions = useMemo(
    () =>
      (allSessions ?? [])
        .filter((s) => s.quarter === CURRENT_QUARTER)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [allSessions],
  );

  if (
    allSessions === undefined ||
    (isInstructor && (roster === undefined || homework === undefined))
  ) {
    return (
      <p className="py-12 text-center font-serif-tc text-base tracking-[0.3em] text-ink-soft">
        載入中……
      </p>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="py-10 text-center font-serif-tc text-base tracking-[0.25em] text-ink-soft">
        {CURRENT_QUARTER} 尚未安排課堂日期
      </p>
    );
  }

  // The earliest date of the season is orientation week (課程信息介紹):
  // it never carries 主領/觀察, in either view.
  const orientationDate = sessions[0]?.date ?? null;

  if (!isInstructor) {
    return (
      <StudentSchedule
        sessions={sessions}
        orientationDate={orientationDate}
      />
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-4">
        <h2 className="font-serif-tc text-2xl font-bold tracking-[0.15em] text-ink">
          課堂安排
        </h2>
        <span className="font-serif-tc text-sm font-bold text-vermilion">
          {CURRENT_QUARTER} · 共 {sessions.length} 堂
        </span>
      </div>
      <nav
        aria-label="課堂安排檢視"
        className="mt-4 flex flex-wrap items-baseline gap-x-1 border-b border-rule pb-2"
      >
        {SCHEDULE_LAYOUTS.map((l, i) => (
          <span key={l.key} className="inline-flex items-baseline">
            {i > 0 && (
              <span className="mr-1 text-rule" aria-hidden>
                ·
              </span>
            )}
            <button
              onClick={() => setLayout(l.key)}
              aria-pressed={layout === l.key}
              className={
                "font-serif-tc text-sm tracking-[0.15em] transition-colors " +
                (layout === l.key
                  ? "font-bold text-vermilion"
                  : "text-ink-soft hover:text-ink")
              }
            >
              {l.label}
            </button>
          </span>
        ))}
      </nav>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {layout === "group"
          ? "按小組填寫每週的主領與觀察；日期已固定，每組輪流服事。"
          : "按週次一覽全班安排；每堂一節，各組的主領與觀察並列。"}
      </p>
      {layout === "group" ? (
        <GroupSections
          sessions={sessions}
          roster={roster ?? []}
          orientationDate={orientationDate}
        />
      ) : (
        <WeekSections
          sessions={sessions}
          roster={roster ?? []}
          orientationDate={orientationDate}
          hw={hwByDate}
        />
      )}
    </div>
  );
}

function GroupSections({
  sessions,
  roster,
  orientationDate,
}: {
  sessions: SessionRow[];
  roster: Doc<"students">[];
  orientationDate: string | null;
}) {
  const grouped = useMemo(() => splitByGroup(roster), [roster]);

  return (
    <div className="mt-6 space-y-10">
      {grouped.named.map(([name, members]) => (
        <GroupScheduleTable
          key={name}
          groupName={name}
          members={members}
          sessions={sessions}
          orientationDate={orientationDate}
        />
      ))}
      {grouped.ungrouped.length > 0 && (
        <GroupScheduleTable
          groupName="未分組"
          members={grouped.ungrouped}
          sessions={sessions}
          orientationDate={orientationDate}
        />
      )}
    </div>
  );
}

// 按週次: the same session docs pivoted — one section per class date,
// groups as rows. Reads and writes the very same sessions as the group
// view, so edits made here show up there immediately. This layout also
// carries the 功課記錄 marks: 筆記 on every member's name in the 組員
// column, 題目 on the week's 主領/觀察 chips (read-only, instructor-only).
function WeekSections({
  sessions,
  roster,
  orientationDate,
  hw,
}: {
  sessions: SessionRow[];
  roster: Doc<"students">[];
  orientationDate: string | null;
  hw: Map<string, Map<string, boolean>>;
}) {
  const groups = useMemo(() => splitByGroup(roster).named, [roster]);

  return (
    <div className="mt-6 space-y-10">
      <p className="text-sm leading-relaxed text-ink-soft">
        功課記錄唯讀，由每週 Google Docs 整理後寫入：筆記記在組員名下，題目記在該週主領與觀察名下。{" "}
        <span role="img" aria-label="已完成" className="font-bold text-ink">✓</span> 已完成 ·{" "}
        <span role="img" aria-label="未完成" className="font-bold text-vermilion">✗</span> 未完成 ·{" "}
        <span role="img" aria-label="未記錄" className="text-rule">–</span> 未記錄
      </p>
      {sessions.map((s) => (
        <WeekTable
          key={s._id}
          session={s}
          groups={groups}
          orientationDate={orientationDate}
          hw={hw.get(s.date) ?? new Map()}
        />
      ))}
    </div>
  );
}

function WeekTable({
  session,
  groups,
  orientationDate,
  hw,
}: {
  session: SessionRow;
  groups: [string, Doc<"students">[]][];
  orientationDate: string | null;
  hw: Map<string, boolean>;
}) {
  const update = useAssignmentUpdater();
  const weekday = weekdayOf(session.date);

  return (
    <section>
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
        <h3 className="font-serif-tc text-lg font-bold tracking-[0.15em] text-ink">
          {session.date}
          <span className="ml-2 text-sm font-normal text-ink-soft">
            週{weekday}
          </span>
        </h3>
      </div>
      {session.date === orientationDate ? (
        <p className="mt-3 font-serif-tc text-sm text-ink-soft">
          課程信息介紹 — 本週無主領觀察
        </p>
      ) : (
        <>
          {hw.size === 0 && (
            <p className="mt-3 font-serif-tc text-sm text-ink-soft">
              本週尚未記錄功課
            </p>
          )}
          <div className="mt-2 overflow-x-auto overflow-y-clip">
            <table className="w-full border-collapse text-left text-base">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th
                    scope="col"
                    className="th-double whitespace-nowrap px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
                  >
                    小組
                  </th>
                  <th
                    scope="col"
                    className="th-double px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
                  >
                    組員（筆記）
                  </th>
                  <th
                    scope="col"
                    className="th-double px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
                  >
                    主領（題目）
                  </th>
                  <th
                    scope="col"
                    className="th-double px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
                  >
                    觀察（題目）
                  </th>
                </tr>
              </thead>
            <tbody>
              {groups.map(([name, members]) => (
                <WeekRow
                  key={name}
                  groupName={name}
                  members={members}
                  session={session}
                  hw={hw}
                  onUpdate={update}
                />
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}

function WeekRow({
  groupName,
  members,
  session,
  hw,
  onUpdate,
}: {
  groupName: string;
  members: Doc<"students">[];
  session: SessionRow;
  hw: Map<string, boolean>;
  onUpdate: AssignmentUpdater;
}) {
  const memberIds = useMemo(() => new Set(members.map((m) => m._id)), [members]);

  return (
    <tr className="border-b border-rule transition-colors hover:bg-paper-deep/60">
      <td className="whitespace-nowrap px-3 py-3 align-top font-serif-tc text-[15px] font-bold text-ink">
        {groupName}
        <span className="ml-1.5 text-xs font-normal text-ink-soft">
          {members.length} 位
        </span>
      </td>
      <td className="px-3 py-3 align-top">
        <div className="flex flex-wrap items-center gap-1.5">
          {members.map((m) => (
            <span
              key={m._id}
              className="inline-flex items-center gap-1 border border-rule px-2 py-1 text-sm text-ink"
            >
              <span className="font-serif-tc font-bold">{m.name}</span>
              <HwMark done={hw.get(`${m._id}:notes`)} label={`${m.name} 筆記`} />
            </span>
          ))}
        </div>
      </td>
      <AssignmentCell
        session={session}
        role="leader"
        tone="ink"
        members={members}
        memberIds={memberIds}
        hw={hw}
        onUpdate={(people) => onUpdate(session, "leader", people)}
      />
      <AssignmentCell
        session={session}
        role="observer"
        tone="vermilion"
        members={members}
        memberIds={memberIds}
        hw={hw}
        onUpdate={(people) => onUpdate(session, "observer", people)}
      />
    </tr>
  );
}

function GroupScheduleTable({
  groupName,
  members,
  sessions,
  orientationDate,
}: {
  groupName: string;
  members: Doc<"students">[];
  sessions: SessionRow[];
  orientationDate: string | null;
}) {
  const update = useAssignmentUpdater();
  const memberIds = useMemo(() => new Set(members.map((m) => m._id)), [members]);

  return (
    <section>
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
        <h3 className="font-serif-tc text-lg font-bold tracking-[0.15em] text-ink">
          {groupName}
        </h3>
        <span className="font-serif-tc text-sm text-ink-soft">
          {members.length} 位
        </span>
      </div>
      <div className="mt-2 overflow-x-auto overflow-y-clip">
        <table className="w-full border-collapse text-left text-base">
          <thead>
            <tr className="border-b-2 border-ink">
              <th
                scope="col"
                className="th-double whitespace-nowrap px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
              >
                日期
              </th>
              <th
                scope="col"
                className="th-double px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
              >
                主領
              </th>
              <th
                scope="col"
                className="th-double px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
              >
                觀察
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const weekday = weekdayOf(s.date);
              if (s.date === orientationDate) {
                return (
                  <tr key={s._id} className="border-b border-rule">
                    <td className="whitespace-nowrap px-3 py-3 align-top font-serif-tc text-[15px] font-bold text-ink">
                      {s.date.slice(5)}
                      <span className="ml-1.5 text-xs font-normal text-ink-soft">
                        週{weekday}
                      </span>
                    </td>
                    <td
                      colSpan={2}
                      className="px-3 py-3 font-serif-tc text-sm text-ink-soft"
                    >
                      課程信息介紹 — 本週無主領觀察
                    </td>
                  </tr>
                );
              }
              return (
                <tr
                  key={s._id}
                  className="border-b border-rule transition-colors hover:bg-paper-deep/60"
                >
                  <td className="whitespace-nowrap px-3 py-3 align-top font-serif-tc text-[15px] font-bold text-ink">
                    {s.date.slice(5)}
                    <span className="ml-1.5 text-xs font-normal text-ink-soft">
                      週{weekday}
                    </span>
                  </td>
                  <AssignmentCell
                    session={s}
                    role="leader"
                    tone="ink"
                    members={members}
                    memberIds={memberIds}
                    onUpdate={(people) => update(s, "leader", people)}
                  />
                  <AssignmentCell
                    session={s}
                    role="observer"
                    tone="vermilion"
                    members={members}
                    memberIds={memberIds}
                    onUpdate={(people) => update(s, "observer", people)}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AssignmentCell({
  session,
  role,
  tone,
  members,
  memberIds,
  hw,
  onUpdate,
}: {
  session: SessionRow;
  role: Role;
  tone: "ink" | "vermilion";
  members: Doc<"students">[];
  memberIds: Set<Id<"students">>;
  // 功課記錄 for this week (questions type). Present only in the by-week
  // layout — the marks ride along on the assignment chips; the by-group
  // layout omits it and stays mark-free.
  hw?: Map<string, boolean>;
  onUpdate: (people: { _id: Id<"students">; name: string }[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const people = (role === "leader" ? session.leaders : session.observers).filter(
    (p) => memberIds.has(p._id),
  );
  const assignedAll = new Set([...session.leaders, ...session.observers].map((p) => p._id));
  const candidates = members.filter((m) => !assignedAll.has(m._id));

  async function change(next: { _id: Id<"students">; name: string }[]) {
    setError(null);
    try {
      await onUpdate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <td className="px-3 py-3 align-top">
      <div className="flex flex-wrap items-center gap-1.5">
        {people.length === 0 && (
          <span className="text-sm text-ink-soft/70">—</span>
        )}
        {people.map((p) => (
          <span
            key={p._id}
            className={
              "inline-flex items-center gap-1 border px-2 py-1 text-sm " +
              (tone === "vermilion"
                ? "border-vermilion/40 text-vermilion"
                : "border-rule text-ink")
            }
          >
            <span className="font-serif-tc font-bold">{p.name}</span>
            {hw && (
              <HwMark
                done={hw.get(`${p._id}:questions`)}
                label={`${p.name} ${roleLabel(role)}題目`}
              />
            )}
            <button
              onClick={() =>
                change(people.filter((x) => x._id !== p._id))
              }
              aria-label={`移除${p.name}`}
              className="ml-0.5 text-ink-soft hover:text-vermilion"
            >
              ×
            </button>
          </span>
        ))}
        <select
          value=""
          onChange={(e) => {
            const target = members.find((m) => m._id === e.target.value);
            if (target) change([...people, { _id: target._id, name: target.name }]);
          }}
          aria-label={`${session.date} ${roleLabel(role)}`}
          className="cursor-pointer border border-dashed border-rule bg-transparent px-1.5 py-1 text-xs text-ink-soft focus:border-ink focus:outline-none"
        >
          <option value="">+ 添加</option>
          {candidates.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1 text-xs text-vermilion">{error}</p>}
    </td>
  );
}

function roleLabel(role: Role) {
  return role === "leader" ? "主領" : "觀察";
}

// 功課記錄 mark: three states, glyph AND color (never color alone).
// ✓ 已完成 (ink), ✗ 未完成 (vermilion), – 未記錄 (quiet gray) — an
// unrecorded mark must never read as "student slacked", only as "agent
// hasn't run yet".
function HwMark({ done, label }: { done: boolean | undefined; label: string }) {
  const state =
    done === undefined
      ? { glyph: "–", cls: "text-rule", text: "未記錄" }
      : done
        ? { glyph: "✓", cls: "font-bold text-ink", text: "已完成" }
        : { glyph: "✗", cls: "font-bold text-vermilion", text: "未完成" };
  return (
    <span
      role="img"
      aria-label={`${label}${state.text}`}
      title={`${label}${state.text}`}
      className={`text-[13px] leading-none ${state.cls}`}
    >
      {state.glyph}
    </span>
  );
}

// ---- Shared helpers (group view + week view) ----

// Both instructor layouts write through the same mutation, so an edit
// made in one view is visible in the other without a reload.
function useAssignmentUpdater(): AssignmentUpdater {
  const assign = useMutation(api.students.updateSessionAssignments);
  return async (session, role, nextPeople) => {
    const otherRoleIds = (
      role === "leader" ? session.observers : session.leaders
    ).map((p) => p._id);
    const ids = nextPeople.map((p) => p._id);
    await assign(
      role === "leader"
        ? { sessionId: session._id, leaderIds: ids, observerIds: otherRoleIds }
        : { sessionId: session._id, leaderIds: otherRoleIds, observerIds: ids },
    );
  };
}

// Roster split into named groups (zh-Hant sort) and 未分組 leftovers.
function splitByGroup(roster: Doc<"students">[]) {
  const map = new Map<string, Doc<"students">[]>();
  const ungrouped: Doc<"students">[] = [];
  for (const s of roster) {
    if (!s.groupName) {
      ungrouped.push(s);
      continue;
    }
    if (!map.has(s.groupName)) map.set(s.groupName, []);
    map.get(s.groupName)!.push(s);
  }
  return {
    named: [...map.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], "zh-Hant"),
    ),
    ungrouped,
  };
}

const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

function weekdayOf(date: string) {
  return WEEKDAY_NAMES[new Date(date + "T00:00:00").getDay()];
}


function StudentSchedule({
  sessions,
  orientationDate,
}: {
  sessions: SessionRow[];
  orientationDate: string | null;
}) {
  const { setTab } = useTab();
  const me = useQuery(api.students.me);
  const group = useQuery(api.students.myGroup);
  const addMe = useMutation(api.students.addMeToSession);
  const removeMe = useMutation(api.students.removeMeFromSession);
  const [error, setError] = useState<string | null>(null);

  if (me === undefined || group === undefined) {
    return (
      <p className="py-12 text-center font-serif-tc text-base tracking-[0.3em] text-ink-soft">
        載入中……
      </p>
    );
  }

  if (!group.registered) {
    return (
      <div className="py-10 text-center">
        <p className="font-serif-tc text-lg font-bold text-ink">本季度尚未登記</p>
        <p className="mt-3 text-sm text-ink-soft">註冊後即可查看您小組的課堂安排。</p>
        <button
          onClick={() => setTab("register")}
          className="mt-8 bg-ink px-10 py-3 font-serif-tc text-sm font-bold tracking-[0.3em] text-paper transition-colors hover:bg-vermilion"
        >
          前往註冊
        </button>
      </div>
    );
  }

  // Only my group's people appear in this table.
  const mateIds = new Set(group.members.map((m) => m._id));
  const myId = me?.student?._id ?? null;

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        點擊「我來主領」或「我來觀察」填入自己的名字；此表只顯示您小組的成員，
        全班即時同步。同一週請擇一角色。
      </p>
      {error && (
        <p role="alert" className="mt-3 border-t border-vermilion pt-3 font-serif-tc text-sm text-vermilion">
          {error}
        </p>
      )}
      <div className="mt-4 overflow-x-auto overflow-y-clip">
        <table className="w-full border-collapse text-left text-base">
          <thead>
            <tr className="border-b-2 border-ink">
              <th
                scope="col"
                className="th-double whitespace-nowrap px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
              >
                日期
              </th>
              <th
                scope="col"
                className="th-double px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
              >
                主領
              </th>
              <th
                scope="col"
                className="th-double px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
              >
                觀察
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const weekday = weekdayOf(s.date);
              if (s.date === orientationDate) {
                return (
                  <tr key={s._id} className="border-b border-rule">
                    <td className="whitespace-nowrap px-3 py-3 align-top font-serif-tc text-[17px] font-bold text-ink">
                      {s.date}
                      <span className="ml-2 text-sm font-normal text-ink-soft">
                        週{weekday}
                      </span>
                    </td>
                    <td
                      colSpan={2}
                      className="px-3 py-3 font-serif-tc text-sm text-ink-soft"
                    >
                      課程信息介紹 — 本週無主領觀察
                    </td>
                  </tr>
                );
              }
              const iLead = myId !== null && s.leaders.some((l) => l._id === myId);
              const iObserve =
                myId !== null && s.observers.some((o) => o._id === myId);
              const groupLeaders = s.leaders.filter((l) => mateIds.has(l._id));
              const groupObservers = s.observers.filter((o) => mateIds.has(o._id));
              return (
                <tr
                  key={s._id}
                  className="border-b border-rule transition-colors hover:bg-paper-deep/60"
                >
                  <td className="whitespace-nowrap px-3 py-3 align-top font-serif-tc text-[17px] font-bold text-ink">
                    {s.date}
                    <span className="ml-2 text-sm font-normal text-ink-soft">
                      週{weekday}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {groupLeaders.map((l) => (
                        <span
                          key={l._id}
                          className="inline-flex items-center gap-1 border border-rule px-2 py-1 text-sm text-ink"
                        >
                          <span className="font-serif-tc font-bold">{l.name}</span>
                          {l._id === myId && (
                            <button
                              onClick={() =>
                                act(() =>
                                  removeMe({ sessionId: s._id, role: "leader" }),
                                )
                              }
                              aria-label="移除我"
                              className="text-ink-soft hover:text-vermilion"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                      {!iLead && myId !== null && (
                        <button
                          onClick={() =>
                            act(() => addMe({ sessionId: s._id, role: "leader" }))
                          }
                          className="border border-dashed border-rule px-2 py-1 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink"
                        >
                          我來主領
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {groupObservers.map((o) => (
                        <span
                          key={o._id}
                          className="inline-flex items-center gap-1 border border-vermilion/40 px-2 py-1 text-sm text-vermilion"
                        >
                          <span className="font-serif-tc font-bold">{o.name}</span>
                          {o._id === myId && (
                            <button
                              onClick={() =>
                                act(() =>
                                  removeMe({ sessionId: s._id, role: "observer" }),
                                )
                              }
                              aria-label="移除我"
                              className="text-ink-soft hover:text-vermilion"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                      {!iObserve && myId !== null && (
                        <button
                          onClick={() =>
                            act(() => addMe({ sessionId: s._id, role: "observer" }))
                          }
                          className="border border-dashed border-vermilion/40 px-2 py-1 text-xs text-vermilion transition-colors hover:border-vermilion"
                        >
                          我來觀察
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
