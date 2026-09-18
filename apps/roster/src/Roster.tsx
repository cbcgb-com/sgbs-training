import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import Avatar from "./Avatar";
import {
  CURRENT_QUARTER,
  WITHDRAWAL_REASON_OTHER,
  WITHDRAWAL_REASONS,
} from "./constants";
import { withdrawReasonValue, zhDate } from "./withdrawal";

type Student = Doc<"students">;
type LeaderRow = Student & { dates: string[] };

const VIEWS = [
  { key: "master", label: "全體" },
  { key: "quarter", label: `本季度` },
  { key: "experience", label: "帶領經驗" },
  { key: "leaders", label: "主領" },
  { key: "observers", label: "觀察" },
  { key: "missed", label: "缺課" },
  { key: "withdrawn", label: "已退出" },
  { key: "k-fellowship", label: "團契" },
  { key: "k-baptism", label: "受洗" },
  { key: "k-gender", label: "性別" },
  { key: "k-quarter", label: "季度" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

export default function Roster() {
  const [view, setView] = useState<ViewKey>("quarter");

  return (
    <div>
      <nav
        aria-label="名單檢視"
        className="flex flex-wrap items-baseline gap-x-1 gap-y-2 border-b border-rule pb-3"
      >
        {VIEWS.map((v, i) => (
          <span key={v.key} className="inline-flex items-baseline">
            {i > 0 && (
              <span className="mr-1 text-rule" aria-hidden>
                ·
              </span>
            )}
            <button
              onClick={() => setView(v.key)}
              aria-pressed={view === v.key}
              className={
                "font-serif-tc text-sm tracking-[0.15em] transition-colors " +
                (view === v.key
                  ? "font-bold text-vermilion"
                  : "text-ink-soft hover:text-ink")
              }
            >
              {v.label}
            </button>
          </span>
        ))}
      </nav>
      <p className="mt-3 text-sm text-ink-soft">
        {view === "quarter" && `參與 ${CURRENT_QUARTER} 的學員`}
        {view === "master" && "全體學員，按姓名筆畫排序"}
        {view === "experience" && "有帶領查經經驗的學員"}
        {view === "leaders" && "曾主領或已排定主領日期的學員"}
        {view === "observers" && "曾觀察或已排定觀察日期的學員"}
        {view === "missed" && "本季有缺課記錄的學員"}
        {view === "withdrawn" &&
          "已退出本季課程的學員；可按季度篩選。出席紀錄保留在資料庫中。"}
        {(view === "k-fellowship" ||
          view === "k-baptism" ||
          view === "k-gender" ||
          view === "k-quarter") &&
          "按類別分組"}
      </p>

      <div className="mt-6">
        {view === "master" && <MasterView />}
        {view === "quarter" && <QuarterView />}
        {view === "experience" && <ExperienceView />}
        {view === "leaders" && <LeadersView />}
        {view === "observers" && <ObserversView />}
        {view === "missed" && <MissedView />}
        {view === "withdrawn" && <WithdrawnView />}
        {view === "k-fellowship" && <Kanban field="fellowship" label="團契" />}
        {view === "k-baptism" && (
          <Kanban field="baptismTime" label="受洗時間" />
        )}
        {view === "k-gender" && <Kanban field="gender" label="性別" />}
        {view === "k-quarter" && (
          <Kanban field="quarter" label="參與訓練的季度" />
        )}
      </div>
    </div>
  );
}

// ---- Grid views ----

function MasterView() {
  const students = useQuery(api.students.all);
  const photos = useQuery(api.students.photoUrls);
  return (
    <StudentTable
      students={students}
      photos={photos}
      columns={[
        ["名字", (s) => s.name, "serif"],
        ["團契", (s) => s.fellowship ?? ""],
        ["性別", (s) => s.gender ?? ""],
        ["郵箱", (s) => s.email ?? ""],
        ["季度", (s) => s.quarter ?? "", "margin"],
        ["小組", (s) => s.groupName ?? ""],
        ["帶領經驗", (s) => s.leadingExperience ?? ""],
        ["缺課", (s) => String(s.missed), "margin"],
      ]}
    />
  );
}

// 本季度: the active roster, with the instructor's 標記退出 control — the
// on-behalf withdrawal surface.
function QuarterView() {
  const students = useQuery(api.students.byQuarter, {});
  const photos = useQuery(api.students.photoUrls);
  return (
    <StudentTable
      students={students}
      photos={photos}
      renderAction={(s) =>
        s.withdrawnAt === undefined ? (
          <WithdrawalAction studentId={s._id} name={s.name} />
        ) : null
      }
      columns={[
        ["名字", (s) => s.name, "serif"],
        ["團契", (s) => s.fellowship ?? ""],
        ["郵箱", (s) => s.email ?? ""],
        ["小組", (s) => s.groupName ?? ""],
        ["帶領經驗", (s) => s.leadingExperience ?? ""],
        ["缺課", (s) => String(s.missed), "margin"],
      ]}
    />
  );
}

// ---- 退出報名 (instructor side) ----

// Per-row mark-withdrawn control: a quiet text action that opens a compact
// inline confirmation with the optional reason (same dropdown + free text
// as the student's own 退出 form). See docs/designs/withdrawal/LLD.md.
function WithdrawalAction({
  studentId,
  name,
}: {
  studentId: Id<"students">;
  name: string;
}) {
  const withdraw = useMutation(api.students.withdrawStudent);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState("");
  const [other, setOther] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      await withdraw({ studentId, reason: withdrawReasonValue(choice, other) });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-serif-tc text-sm tracking-[0.1em] text-ink-soft underline underline-offset-4 transition-colors hover:text-vermilion"
      >
        標記退出
      </button>
    );
  }

  return (
    <div className="min-w-56 border border-vermilion/40 bg-paper-deep/40 px-3 py-3 text-left">
      <p className="font-serif-tc text-sm font-bold text-ink">
        確定讓 {name} 退出？
      </p>
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        aria-label="退出原因"
        className="mt-2 w-full cursor-pointer border border-rule bg-paper px-2 py-1 text-sm text-ink focus:border-ink focus:outline-none"
      >
        <option value="">不填寫原因</option>
        {WITHDRAWAL_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {choice === WITHDRAWAL_REASON_OTHER && (
        <input
          type="text"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="請簡述原因"
          aria-label="其他原因"
          className="mt-2 w-full border border-rule bg-paper px-2 py-1 text-sm text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none"
        />
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-vermilion">
          {error}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="border border-vermilion bg-ink px-3 py-1 font-serif-tc text-xs font-bold tracking-[0.15em] text-paper transition-colors hover:bg-vermilion disabled:opacity-50"
        >
          {busy ? "處理中" : "確認退出"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="border border-rule px-3 py-1 font-serif-tc text-xs font-bold tracking-[0.15em] text-ink transition-colors hover:border-ink disabled:opacity-50"
        >
          取消
        </button>
      </div>
    </div>
  );
}

// 已退出: withdrawn students, filterable by quarter, with 復原 (instructor
// undo). Attendance history stays in the database; this view is the
// lifecycle manager for the soft state.
function WithdrawnView() {
  const rows = useQuery(api.students.withdrawn);
  const photos = useQuery(api.students.photoUrls);
  const reactivate = useMutation(api.students.reactivateStudent);
  // Default to 全部: a quarter is only an option when a withdrawal happened
  // in it, so defaulting to CURRENT_QUARTER could show an empty view while
  // historical rows exist (and leave the select with no matching option).
  const [quarter, setQuarter] = useState<string>("all");
  const [busyId, setBusyId] = useState<Id<"students"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!rows) return <Loading />;

  const quarters = [...new Set(rows.map((r) => r.quarter))]
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));
  const filtered =
    quarter === "all" ? rows : rows.filter((r) => r.quarter === quarter);
  const sorted = [...filtered].sort(
    (a, b) =>
      b.withdrawnAt - a.withdrawnAt ||
      a.name.localeCompare(b.name, "zh-Hant"),
  );

  async function restore(id: Id<"students">) {
    setError(null);
    setBusyId(id);
    try {
      await reactivate({ studentId: id });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-3">
        <span className="font-serif-tc text-sm text-ink-soft">
          共 {sorted.length} 位已退出
        </span>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          季度
          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="cursor-pointer border border-rule bg-paper px-2 py-1 font-serif-tc text-base text-ink focus:border-ink focus:outline-none"
          >
            {quarters.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
            <option value="all">全部</option>
          </select>
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 border-t border-vermilion pt-3 font-serif-tc text-sm text-vermilion"
        >
          {error}
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="py-14 text-center font-serif-tc text-base tracking-[0.25em] text-ink-soft">
          此檢視暫無記錄
        </p>
      ) : (
        <div className="mt-2 overflow-x-auto overflow-y-clip">
          <table className="w-full border-collapse text-left text-base tabular-nums">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="th-double w-10 px-1 py-2.5">
                  <span className="sr-only">序號</span>
                </th>
                {[
                  "名字",
                  "團契",
                  "小組",
                  "季度",
                  "郵箱",
                  "退出日期",
                  "退出原因",
                  "",
                ].map((label, i) => (
                  <th
                    key={label || `col-${i}`}
                    scope="col"
                    className="th-double whitespace-nowrap px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
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
                        url={
                          s.photoStorageId
                            ? photos?.[s.photoStorageId]
                            : undefined
                        }
                      />
                      <span className="font-serif-tc text-[17px] font-bold text-ink">
                        {s.name}
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink">
                    {s.fellowship || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink">
                    {s.groupName || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-ink-soft">
                    {s.quarter || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-ink">
                    {s.email || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-ink-soft">
                    {zhDate(s.withdrawnAt)}
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">
                    {s.withdrawnReason || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => restore(s._id)}
                      disabled={busyId === s._id}
                      className="font-serif-tc text-sm tracking-[0.1em] text-ink-soft underline underline-offset-4 transition-colors hover:text-ink disabled:opacity-50"
                    >
                      {busyId === s._id ? "處理中" : "復原"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExperienceView() {
  const students = useQuery(api.students.withExperience);
  const photos = useQuery(api.students.photoUrls);
  return (
    <StudentTable
      students={students}
      photos={photos}
      columns={[
        ["名字", (s) => s.name, "serif"],
        ["團契", (s) => s.fellowship ?? ""],
        ["帶領經驗", (s) => s.leadingExperience ?? ""],
        ["帶領日期", (s) => (s.leadingDates ?? []).join("、"), "margin"],
      ]}
    />
  );
}

function LeadersView() {
  const students = useQuery(api.students.leaders);
  const photos = useQuery(api.students.photoUrls);
  return (
    <StudentTable
      students={students}
      photos={photos}
      columns={[
        ["名字", (s: LeaderRow) => s.name, "serif"],
        ["團契", (s: LeaderRow) => s.fellowship ?? ""],
        ["主領日期", (s: LeaderRow) => s.dates.join("、"), "margin"],
      ]}
    />
  );
}

function ObserversView() {
  const students = useQuery(api.students.observers);
  const photos = useQuery(api.students.photoUrls);
  return (
    <StudentTable
      students={students}
      photos={photos}
      columns={[
        ["名字", (s: LeaderRow) => s.name, "serif"],
        ["團契", (s: LeaderRow) => s.fellowship ?? ""],
        ["觀察日期", (s: LeaderRow) => s.dates.join("、"), "margin"],
      ]}
    />
  );
}

type Mark = "yes" | "no" | "none";

function MissedView() {
  const data = useQuery(api.students.quarterAttendance, {});
  if (!data) return <Loading />;
  const rows = data.students
    .filter((s) => s.marks.includes("no"))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  return (
    <div>
      <StudentTable
        students={rows}
        markColumns
        columns={[
          ["名字", (s) => s.name, "serif"],
          ["團契", (s) => s.fellowship],
          [
            "缺課",
            (s) => String(s.marks.filter((m) => m === "no").length),
            "margin",
          ],
        ]}
      />
      <BeatLegend />
    </div>
  );
}

// ---- Attendance beat line (the Missed view's marks) ----

function DateMarks({ marks }: { marks: Mark[] }) {
  const yes = marks.filter((m) => m === "yes").length;
  const no = marks.filter((m) => m === "no").length;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="img"
      aria-label={`課堂出席：${yes} 堂出席、${no} 堂缺席`}
    >
      {marks.map((state, i) => (
        <Mark key={i} state={state} />
      ))}
    </span>
  );
}

function Mark({ state }: { state: "yes" | "no" | "none" }) {
  return state === "yes" ? (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <circle cx="6" cy="6" r="4" fill="currentColor" className="text-ink" />
    </svg>
  ) : state === "no" ? (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <circle
        cx="6"
        cy="6"
        r="4"
        fill="none"
        strokeWidth="1.6"
        className="stroke-vermilion"
      />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <line
        x1="2"
        y1="6"
        x2="10"
        y2="6"
        strokeWidth="1.6"
        className="stroke-rule"
      />
    </svg>
  );
}

function BeatLegend() {
  const items = [
    { state: "yes" as const, text: "出席" },
    { state: "no" as const, text: "缺席" },
    { state: "none" as const, text: "未記錄" },
  ];
  return (
    <p className="mt-3 flex items-center gap-5 text-sm text-ink-soft">
      <span className="font-serif-tc tracking-[0.2em] text-ink">圖例</span>
      {items.map((it) => (
        <span key={it.state} className="inline-flex items-center gap-1.5">
          <Mark state={it.state} />
          {it.text}
        </span>
      ))}
    </p>
  );
}

// ---- Kanban views ----

function Kanban({
  field,
  label,
}: {
  field: "fellowship" | "baptismTime" | "gender" | "quarter";
  label: string;
}) {
  const groups = useQuery(api.students.grouped, { field });
  const photos = useQuery(api.students.photoUrls);
  if (!groups) return <Loading />;
  const sorted = [...groups].sort((a, b) => b.count - a.count);
  return (
    <div className="flex gap-5 overflow-x-auto overflow-y-clip pb-4">
      {sorted.map((g) => (
        <section key={g.value} className="w-60 shrink-0">
          <header className="flex items-baseline justify-between border-b-2 border-ink pb-2">
            <h3 className="font-serif-tc text-base font-bold tracking-[0.1em] text-ink">
              {g.value}
            </h3>
            <span className="font-serif-tc text-sm text-vermilion tabular-nums">
              {g.count}
            </span>
          </header>
          <ul className="mt-3 space-y-2">
            {[...g.students]
              .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"))
              .map((s) => (
                <li
                  key={s._id}
                  className="border border-rule bg-paper px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={s.name}
                      url={
                        s.photoStorageId
                          ? photos?.[s.photoStorageId]
                          : undefined
                      }
                      size={30}
                    />
                    <div className="min-w-0">
                      <p className="font-serif-tc text-[15px] font-bold text-ink">
                        {s.name}
                      </p>
                      {s.email && (
                        <p className="mt-0.5 truncate text-sm text-ink-soft">
                          {s.email}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ---- Shared table ----

type ColumnStyle = "serif" | "margin";

function StudentTable<
  T extends {
    _id: Id<"students">;
    name: string;
    photoStorageId?: Id<"_storage">;
    marks?: Mark[];
    withdrawnAt?: number;
  },
>({
  students,
  columns,
  markColumns,
  photos,
  renderAction,
}: {
  students: T[] | undefined;
  columns: [string, (s: T) => string, ColumnStyle?][];
  markColumns?: boolean;
  photos?: Record<string, string | null>;
  renderAction?: (s: T) => React.ReactNode;
}) {
  if (!students) return <Loading />;
  const sorted = [...students].sort((a, b) =>
    a.name.localeCompare(b.name, "zh-Hant"),
  );
  if (sorted.length === 0) {
    return (
      <p className="py-14 text-center font-serif-tc text-base tracking-[0.25em] text-ink-soft">
        此檢視暫無記錄
      </p>
    );
  }
  return (
    <div className="overflow-x-auto overflow-y-clip">
      <table className="w-full border-collapse text-left text-base tabular-nums">
        <thead>
          <tr className="border-b-2 border-ink">
            <th className="w-10 px-1 py-2.5">
              <span className="sr-only">序號</span>
            </th>
            {columns.map(([label]) => (
              <th
                key={label}
                scope="col"
                className="th-double whitespace-nowrap px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
              >
                {label}
              </th>
            ))}
            {markColumns && (
              <th
                scope="col"
                className="th-double px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
              >
                課堂日期
              </th>
            )}
            {renderAction && (
              <th
                scope="col"
                className="th-double px-3 py-2.5 text-[13px] font-bold tracking-[0.2em] text-ink-soft"
              >
                <span className="sr-only">操作</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr
              key={s._id}
              className="border-b border-rule transition-colors hover:bg-paper-deep/60"
            >
              <td className="px-1 py-2.5 text-right font-serif-tc text-sm text-vermilion">
                {i + 1}
              </td>
              {columns.map(([label, get, style]) => (
                <td
                  key={label}
                  className={
                    "whitespace-nowrap px-3 py-2.5 " +
                    (style === "serif"
                      ? "text-[15px] text-ink"
                      : style === "margin"
                        ? "text-right text-ink-soft"
                        : "text-ink")
                  }
                >
                  {style === "serif" ? (
                    <span className="flex items-center gap-2.5">
                      <Avatar
                        name={s.name}
                        url={
                          s.photoStorageId
                            ? photos?.[s.photoStorageId]
                            : undefined
                        }
                      />
                      <span className="font-serif-tc text-[17px] font-bold">{get(s)}</span>
                      {s.withdrawnAt !== undefined && (
                        <span className="shrink-0 border border-vermilion/50 px-1.5 py-0.5 text-[13px] font-bold tracking-[0.1em] text-vermilion">
                          已退出
                        </span>
                      )}
                    </span>
                  ) : (
                    (get(s) || "—")
                  )}
                </td>
              ))}
              {markColumns && (
                <td className="px-3 py-2.5">
                  <DateMarks marks={s.marks ?? []} />
                </td>
              )}
              {renderAction && (
                <td className="px-3 py-2.5">{renderAction(s)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-right text-sm text-ink-soft tabular-nums">
        共 {sorted.length} 條記錄
      </p>
    </div>
  );
}

function Loading() {
  return (
    <p className="py-12 text-center font-serif-tc text-base tracking-[0.3em] text-ink-soft">
      載入中……
    </p>
  );
}
