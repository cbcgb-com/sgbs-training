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

// 課堂安排: this season's five class dates, organized by small group.
// Each group gets its own table — weeks as rows, 主領/觀察 as columns.
// Historical quarters live in the database but are not shown.
export default function ScheduleView({ isInstructor }: { isInstructor: boolean }) {
  const allSessions = useQuery(api.students.schedule);
  const roster = useQuery(
    api.students.byQuarter,
    isInstructor ? {} : "skip",
  );

  const sessions = useMemo(
    () =>
      (allSessions ?? [])
        .filter((s) => s.quarter === CURRENT_QUARTER)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [allSessions],
  );

  if (allSessions === undefined || (isInstructor && roster === undefined)) {
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

  if (!isInstructor) {
    return <StudentSchedule sessions={sessions} />;
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
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        按小組填寫每週的主領與觀察；日期已固定，每組輪流服事。
      </p>
      <GroupSections sessions={sessions} roster={roster ?? []} />
    </div>
  );
}

function GroupSections({
  sessions,
  roster,
}: {
  sessions: SessionRow[];
  roster: Doc<"students">[];
}) {
  const named = useMemo(() => {
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
  }, [roster]);

  return (
    <div className="mt-6 space-y-10">
      {named.named.map(([name, members]) => (
        <GroupScheduleTable
          key={name}
          groupName={name}
          members={members}
          sessions={sessions}
        />
      ))}
      {named.ungrouped.length > 0 && (
        <GroupScheduleTable
          groupName="未分組"
          members={named.ungrouped}
          sessions={sessions}
        />
      )}
    </div>
  );
}

function GroupScheduleTable({
  groupName,
  members,
  sessions,
}: {
  groupName: string;
  members: Doc<"students">[];
  sessions: SessionRow[];
}) {
  const assign = useMutation(api.students.updateSessionAssignments);
  const memberIds = useMemo(() => new Set(members.map((m) => m._id)), [members]);

  async function update(
    session: SessionRow,
    role: Role,
    nextPeople: { _id: Id<"students">; name: string }[],
  ) {
    const otherRoleIds = (
      role === "leader" ? session.observers : session.leaders
    ).map((p) => p._id);
    const ids = nextPeople.map((p) => p._id);
    await assign(
      role === "leader"
        ? { sessionId: session._id, leaderIds: ids, observerIds: otherRoleIds }
        : { sessionId: session._id, leaderIds: otherRoleIds, observerIds: ids },
    );
  }

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
      <div className="mt-2 overflow-x-auto">
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
              const dateObj = new Date(s.date + "T00:00:00");
              const weekday = [
                "日", "一", "二", "三", "四", "五", "六",
              ][dateObj.getDay()];
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
  onUpdate,
}: {
  session: SessionRow;
  role: Role;
  tone: "ink" | "vermilion";
  members: Doc<"students">[];
  memberIds: Set<Id<"students">>;
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


function StudentSchedule({ sessions }: { sessions: SessionRow[] }) {
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
      <div className="mt-4 overflow-x-auto">
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
              const dateObj = new Date(s.date + "T00:00:00");
              const weekday = [
                "日", "一", "二", "三", "四", "五", "六",
              ][dateObj.getDay()];
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
