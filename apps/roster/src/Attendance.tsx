import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { CURRENT_QUARTER } from "./constants";
import { splitByGroup } from "./attendanceGroups";
import Avatar from "./Avatar";

type Mark = "yes" | "no" | "none";

type AttendanceRow = {
  _id: Id<"students">;
  name: string;
  fellowship: string;
  groupName: string;
  photoStorageId?: Id<"_storage">;
  missed: number;
  marks: Mark[];
};

// Instructor layout for 出席: by group (default) or the flat name list.
// The choice persists in localStorage across visits; first load is 按小組.
type AttendanceLayout = "group" | "name";

const ATTENDANCE_LAYOUTS = [
  { key: "group" as const, label: "按小組" },
  { key: "name" as const, label: "按名單" },
];

const LAYOUT_STORAGE_KEY = "sgbs-roster-attendance-layout";

function useAttendanceLayout() {
  const [layout, setLayout] = useState<AttendanceLayout>(() => {
    try {
      return localStorage.getItem(LAYOUT_STORAGE_KEY) === "name"
        ? "name"
        : "group";
    } catch {
      return "group";
    }
  });

  function update(next: AttendanceLayout) {
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode) — keep the in-memory choice.
    }
  }

  return [layout, update] as const;
}

// 出席: the instructor's per-date attendance sheet. Pick a class date,
// mark each student 出席／缺席 (tapping the active mark again un-records
// it), or fill the whole sheet with 未記錄全部出席 — which only completes
// the sheet and never overwrites an explicit mark. The sheet opens
// grouped by 小組 (the roster's actual groupName values); 按名單 is one
// toggle away. See docs/designs/attendance/LLD.md.
export default function Attendance() {
  const data = useQuery(api.students.quarterAttendance, {});
  const photos = useQuery(api.students.photoUrls);
  const record = useMutation(api.students.recordAttendance);
  const clear = useMutation(api.students.clearAttendance);
  const bulk = useMutation(api.students.markAllAttended);
  const [layout, setLayout] = useAttendanceLayout();

  const [picked, setPicked] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<Id<"students"> | "bulk" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => data?.dates ?? [], [data]);

  // Default date: today when it is a class day, else the next upcoming
  // date, else the last date of the season (all past).
  const defaultDate = useMemo(() => {
    if (dates.length === 0) return null;
    const today = localToday();
    return dates.find((d) => d >= today) ?? dates[dates.length - 1];
  }, [dates]);
  const date = picked ?? defaultDate;

  if (data === undefined || photos === undefined) return <Loading />;
  if (data.dates.length === 0) {
    return (
      <p className="py-10 text-center font-serif-tc text-base tracking-[0.25em] text-ink-soft">
        {CURRENT_QUARTER} 尚未安排課堂日期
      </p>
    );
  }

  const students = [...data.students].sort((a, b) =>
    a.name.localeCompare(b.name, "zh-Hant"),
  );
  const groups = splitByGroup(data.students);
  const dateIndex = data.dates.indexOf(date!);
  const marksOf = (s: AttendanceRow): Mark => s.marks[dateIndex] ?? "none";
  const yes = data.students.filter((s) => marksOf(s) === "yes").length;
  const no = data.students.filter((s) => marksOf(s) === "no").length;
  const unrecorded = data.students.length - yes - no;

  async function setMark(s: AttendanceRow, target: "yes" | "no") {
    if (!date) return;
    setError(null);
    setBusyId(s._id);
    const current = marksOf(s);
    try {
      if (current === target) {
        await clear({ studentId: s._id, date });
      } else {
        await record({ studentId: s._id, date, attended: target === "yes" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function fillAll() {
    if (!date) return;
    setError(null);
    setBusyId("bulk");
    try {
      await bulk({ date });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-4">
        <h2 className="font-serif-tc text-2xl font-bold tracking-[0.15em] text-ink">
          出席
        </h2>
        <span className="font-serif-tc text-sm font-bold text-vermilion">
          {CURRENT_QUARTER} · 共 {data.dates.length} 堂
        </span>
      </div>
      <nav
        aria-label="出席檢視"
        className="mt-4 flex flex-wrap items-baseline gap-x-1 border-b border-rule pb-2"
      >
        {ATTENDANCE_LAYOUTS.map((l, i) => (
          <span key={l.key} className="inline-flex items-baseline">
            {i > 0 && (
              <span className="mr-1 text-rule" aria-hidden>
                ·
              </span>
            )}
            <button
              type="button"
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
        每堂課後點名。再點一次已標記的按鈕即取消記錄；「未記錄全部出席」只填寫尚未記錄的學員，不會更動已標記的出席或缺席。
      </p>

      <div
        role="group"
        aria-label="選擇課堂日期"
        className="mt-5 flex flex-wrap gap-1.5 border-b border-rule pb-4"
      >
        {data.dates.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setPicked(d)}
            aria-pressed={d === date}
            className={
              "border px-3 py-1.5 font-serif-tc text-sm tracking-[0.1em] tabular-nums transition-colors " +
              (d === date
                ? "border-ink bg-ink font-bold text-paper"
                : "border-rule bg-paper text-ink-soft hover:border-ink hover:text-ink")
            }
          >
            {zhDay(d)}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 border-t border-vermilion pt-3 font-serif-tc text-sm text-vermilion"
        >
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <p
          className="text-sm text-ink-soft tabular-nums"
          aria-live="polite"
        >
          已記錄 {yes + no}/{data.students.length} · 出席 {yes} · 缺席 {no} ·
          未記錄 {unrecorded}
        </p>
        <button
          type="button"
          onClick={fillAll}
          disabled={unrecorded === 0 || busyId !== null}
          className="border border-vermilion bg-ink px-3 py-1.5 font-serif-tc text-xs font-bold tracking-[0.15em] text-paper transition-colors hover:bg-vermilion disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busyId === "bulk" ? "處理中" : "未記錄全部出席"}
        </button>
      </div>

      {students.length === 0 ? (
        <p className="py-14 text-center font-serif-tc text-base tracking-[0.25em] text-ink-soft">
          此檢視暫無記錄
        </p>
      ) : layout === "group" ? (
        <div className="mt-6 space-y-10">
          {groups.map((g) => (
            <GroupSheet
              key={g.name}
              groupName={g.name}
              students={g.students}
              date={date!}
              marksOf={marksOf}
              photos={photos}
              busyId={busyId}
              onSetMark={setMark}
            />
          ))}
          <p className="mt-3 text-right text-sm text-ink-soft tabular-nums">
            共 {students.length} 條記錄
          </p>
        </div>
      ) : (
        <AttendanceTable
          students={students}
          date={date!}
          marksOf={marksOf}
          photos={photos}
          busyId={busyId}
          onSetMark={setMark}
        />
      )}
    </div>
  );
}

function GroupSheet({
  groupName,
  students,
  date,
  marksOf,
  photos,
  busyId,
  onSetMark,
}: {
  groupName: string;
  students: AttendanceRow[];
  date: string;
  marksOf: (s: AttendanceRow) => Mark;
  photos: Record<string, string | null> | null | undefined;
  busyId: Id<"students"> | "bulk" | null;
  onSetMark: (s: AttendanceRow, target: "yes" | "no") => void;
}) {
  const yes = students.filter((s) => marksOf(s) === "yes").length;
  const no = students.filter((s) => marksOf(s) === "no").length;
  const unrecorded = students.length - yes - no;
  return (
    <section aria-label={groupName}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-ink pb-2">
        <h3 className="font-serif-tc text-lg font-bold tracking-[0.15em] text-ink">
          {groupName}
        </h3>
        <span className="font-serif-tc text-sm text-ink-soft tabular-nums">
          {students.length} 位 · 出席 {yes} · 缺席 {no} · 未記錄 {unrecorded}
        </span>
      </div>
      <AttendanceTable
        students={students}
        date={date}
        marksOf={marksOf}
        photos={photos}
        busyId={busyId}
        onSetMark={onSetMark}
        showFooter={false}
      />
    </section>
  );
}

function AttendanceTable({
  students,
  date,
  marksOf,
  photos,
  busyId,
  onSetMark,
  showFooter = true,
}: {
  students: AttendanceRow[];
  date: string;
  marksOf: (s: AttendanceRow) => Mark;
  photos: Record<string, string | null> | null | undefined;
  busyId: Id<"students"> | "bulk" | null;
  onSetMark: (s: AttendanceRow, target: "yes" | "no") => void;
  showFooter?: boolean;
}) {
  return (
    <div className="mt-2 overflow-x-auto overflow-y-clip">
      <table className="w-full border-collapse text-left text-base tabular-nums">
        <thead>
          <tr className="border-b-2 border-ink">
            <th className="w-10 px-1 py-2.5">
              <span className="sr-only">序號</span>
            </th>
            {["名字", "團契", "小組", "季內缺課"].map((label) => (
              <th
                key={label}
                scope="col"
                className="th-double whitespace-nowrap px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => {
            const mark = marksOf(s);
            const busy = busyId === s._id;
            return (
              <tr
                key={s._id}
                className="border-b border-rule transition-colors hover:bg-paper-deep/60"
              >
                <td className="px-1 py-2.5 text-right font-serif-tc text-sm text-vermilion">
                  {i + 1}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <Avatar
                      name={s.name}
                      size={48}
                      url={
                        s.photoStorageId
                          ? photos?.[s.photoStorageId]
                          : undefined
                      }
                    />
                    <span
                      role="group"
                      aria-label={`${s.name} ${zhDay(date)} 出席記錄`}
                      className="inline-flex items-center gap-1.5"
                    >
                      <MarkButton
                        label="出席"
                        active={mark === "yes"}
                        tone="yes"
                        disabled={busy}
                        onClick={() => onSetMark(s, "yes")}
                      />
                      <MarkButton
                        label="缺席"
                        active={mark === "no"}
                        tone="no"
                        disabled={busy}
                        onClick={() => onSetMark(s, "no")}
                      />
                    </span>
                    <span className="font-serif-tc text-[17px] font-bold text-ink">
                      {s.name}
                    </span>
                    {mark === "none" && (
                      <span className="font-serif-tc text-xs tracking-[0.1em] text-rule">
                        未記錄
                      </span>
                    )}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink">
                  {s.fellowship || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink">
                  {s.groupName || "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-ink-soft">
                  {s.missed > 0 ? s.missed : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {showFooter && (
        <p className="mt-3 text-right text-sm text-ink-soft tabular-nums">
          共 {students.length} 條記錄
        </p>
      )}
    </div>
  );
}

function MarkButton({
  label,
  active,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: "yes" | "no";
  disabled: boolean;
  onClick: () => void;
}) {
  const base =
    "border px-3 py-1.5 font-serif-tc text-sm font-bold tracking-[0.15em] transition-colors disabled:opacity-50";
  const look = active
    ? tone === "yes"
      ? "border-ink bg-ink text-paper"
      : "border-vermilion bg-vermilion text-paper"
    : "border-rule bg-paper text-ink-soft hover:border-ink hover:text-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`${base} ${look}`}
    >
      {label}
    </button>
  );
}

// "2026-09-20" → "9月20日（日）" — session dates are Sundays.
function zhDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function Loading() {
  return (
    <p className="py-12 text-center font-serif-tc text-base tracking-[0.3em] text-ink-soft">
      載入中……
    </p>
  );
}
