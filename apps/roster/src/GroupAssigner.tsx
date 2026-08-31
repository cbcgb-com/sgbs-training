import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { computeDiverseGroups, groupDiversitySummary } from "./groups";
import { CURRENT_QUARTER } from "./constants";

type Student = Doc<"students">;

interface DraftGroup {
  name: string;
  members: Student[];
}

const UNGROUPED = "未分組";

// 分組: one-click diverse grouping with full manual override.
// The draft lives in local state until 儲存分組 persists it.
export default function GroupAssigner() {
  const roster = useQuery(api.students.byQuarter, {});
  const saveGroups = useMutation(api.students.saveGroups);
  const renameGroupMut = useMutation(api.students.renameGroup);

  const [draft, setDraft] = useState<DraftGroup[] | null>(null);
  const [groupSize, setGroupSize] = useState(4);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      roster
        ? [...roster].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"))
        : undefined,
    [roster],
  );

  // The saved grouping, as a fallback view when no draft exists.
  const savedDraft = useMemo<DraftGroup[] | null>(() => {
    if (!sorted) return null;
    const map = new Map<string, Student[]>();
    const ungrouped: Student[] = [];
    for (const s of sorted) {
      if (!s.groupName) {
        ungrouped.push(s);
        continue;
      }
      if (!map.has(s.groupName)) map.set(s.groupName, []);
      map.get(s.groupName)!.push(s);
    }
    const groups = [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "zh-Hant"))
      .map(([name, members]) => ({ name, members }));
    if (ungrouped.length > 0) {
      groups.push({ name: UNGROUPED, members: ungrouped });
    }
    return groups.length > 0 ? groups : null;
  }, [sorted]);

  const view = draft ?? savedDraft;

  function divide() {
    if (!sorted) return;
    const { groups } = computeDiverseGroups(sorted, groupSize);
    setDraft(
      groups.map((members, i) => ({
        name: `第${i + 1}組`,
        members: [...members].sort((a, b) =>
          a.name.localeCompare(b.name, "zh-Hant"),
        ),
      })),
    );
    setNotice("已產生分組建議：可直接搬動學員微調，或重新點擊平均分組換一種分法。");
    setSaved(null);
    setError(null);
  }

  function updateDraft(next: DraftGroup[]) {
    setDraft(next);
    setSaved(null);
  }

  function moveStudent(studentId: string, toName: string) {
    if (!view) return;
    const base = draft ?? savedDraft;
    if (!base) return;
    const next: DraftGroup[] = base.map((g) => ({ name: g.name, members: [] }));
    let moved: Student | undefined;
    for (const g of base) {
      const idx = g.members.findIndex((m) => m._id === studentId);
      if (idx >= 0) {
        moved = g.members[idx];
        g.members.splice(idx, 1);
        break;
      }
    }
    if (!moved) return;
    for (const g of next) {
      const match = base.find((b) => b.name === g.name);
      if (match) g.members = [...match.members];
    }
    const target = next.find((g) => g.name === toName);
    if (target) target.members.push(moved);
    updateDraft(next.filter((g) => g.members.length > 0 || g.name !== UNGROUPED));
  }

  async function renameGroupOnBlur(group: DraftGroup, to: string) {
    const name = to.trim();
    if (name === group.name || !name) return;
    if (group.name === UNGROUPED) return;
    // Renaming an already-saved group sweeps the DB immediately; renaming
    // inside an unsaved draft only renames the draft column.
    if (!draft) {
      try {
        const n = await renameGroupMut({ from: group.name, to: name });
        setNotice(`已將${group.name}改名為「${name}」（${n} 位學員）。`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
      return;
    }
    updateDraft(
      draft.map((g) => (g.name === group.name ? { ...g, name } : g)),
    );
  }

  async function persist() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const assignments = draft.flatMap((g) =>
        g.name === UNGROUPED
          ? g.members.map((m) => ({ studentId: m._id, groupName: "" }))
          : g.members.map((m) => ({ studentId: m._id, groupName: g.name })),
      );
      const res = await saveGroups({ assignments });
      setDraft(null);
      setSaved(
        `已儲存：${res.updated} 位學員分到 ${
          draft.filter((g) => g.name !== UNGROUPED).length
        } 組。`,
      );
      setNotice(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (sorted === undefined || view === null) {
    return (
      <p className="py-12 text-center font-serif-tc text-base tracking-[0.3em] text-ink-soft">
        載入中……
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-4">
        <h2 className="font-serif-tc text-2xl font-bold tracking-[0.15em] text-ink">
          分組（{CURRENT_QUARTER}）
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="font-serif-tc text-sm font-bold text-ink">
            每組人數
            <input
              type="number"
              min={2}
              max={10}
              value={groupSize}
              onChange={(e) =>
                setGroupSize(Math.max(2, Number(e.target.value) || 4))
              }
              className="ml-2 w-16 border-0 border-b border-rule bg-transparent px-0 py-1 text-center font-sans-tc text-base text-ink focus:border-ink focus:outline-none"
            />
          </label>
          <button
            onClick={divide}
            disabled={saving}
            className="bg-ink px-5 py-2 font-serif-tc text-sm font-bold tracking-[0.2em] text-paper transition-colors hover:bg-vermilion disabled:opacity-50"
          >
            一鍵平均分組
          </button>
          {draft && (
            <button
              onClick={persist}
              disabled={saving}
              className="border border-vermilion px-5 py-2 font-serif-tc text-sm font-bold tracking-[0.2em] text-vermilion transition-colors hover:bg-vermilion hover:text-paper disabled:opacity-50"
            >
              儲存分組
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        依團契、性別、受洗時間、帶領經驗自動分散，盡量讓每組背景多元。
        分完後可直接搬動學員覆寫建議；組名也可以直接修改。
      </p>

      {notice && (
        <p className="mt-3 border-l border-gold/70 pl-3 text-sm text-ink-soft">
          {notice}
        </p>
      )}
      {saved && (
        <p className="mt-3 border-l border-gold/70 pl-3 text-sm text-ink-soft">
          {saved}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 border-t border-vermilion pt-3 font-serif-tc text-sm text-vermilion">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {view.map((g) => {
          const summary = groupDiversitySummary(g.members);
          const isUngrouped = g.name === UNGROUPED;
          return (
            <section
              key={g.name}
              className={
                "border bg-paper p-3 " +
                (isUngrouped ? "border-dashed border-rule" : "border-rule")
              }
            >
              <div className="flex items-center gap-2 border-b border-rule pb-2">
                {isUngrouped ? (
                  <span className="font-serif-tc text-base font-bold text-ink-soft">
                    {g.name}
                  </span>
                ) : (
                  <input
                    defaultValue={g.name}
                    onBlur={(e) => renameGroupOnBlur(g, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    aria-label="組名"
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 font-serif-tc text-base font-bold text-ink focus:outline-none"
                  />
                )}
                <span className="font-serif-tc text-sm text-vermilion tabular-nums">
                  {g.members.length}
                </span>
              </div>
              {!isUngrouped && g.members.length > 0 && (
                <p className="mt-1.5 text-xs text-ink-soft">
                  團契 {summary.fellowship} · 性別 {summary.gender} · 受洗{" "}
                  {summary.baptismTime} · 經驗 {summary.leadingExperience}
                </p>
              )}
              <ul className="mt-2 space-y-2">
                {[...g.members]
                  .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"))
                  .map((m) => (
                    <li
                      key={m._id}
                      className="flex items-center justify-between gap-2 bg-paper-deep/60 px-2.5 py-1.5"
                    >
                      <span className="truncate font-serif-tc text-[15px] font-bold text-ink">
                        {m.name}
                      </span>
                      <select
                        value={isUngrouped ? "" : g.name}
                        onChange={(e) => moveStudent(m._id, e.target.value)}
                        aria-label={`搬動${m.name}`}
                        className="shrink-0 cursor-pointer border border-rule bg-paper px-1.5 py-0.5 text-xs text-ink-soft focus:border-ink focus:outline-none"
                      >
                        {isUngrouped && <option value={UNGROUPED}>{UNGROUPED}</option>}
                        {view
                          .filter((other) => other.name !== UNGROUPED)
                          .map((other) => (
                            <option key={other.name} value={other.name}>
                              {other.name}
                            </option>
                          ))}
                      </select>
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
