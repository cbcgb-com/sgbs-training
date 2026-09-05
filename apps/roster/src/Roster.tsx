import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { CURRENT_QUARTER } from "./constants";

type Student = Doc<"students">;
type LeaderRow = Student & { dates: string[] };

const VIEWS = [
  { key: "master", label: "全體" },
  { key: "quarter", label: `本季度` },
  { key: "experience", label: "帶領經驗" },
  { key: "leaders", label: "主領" },
  { key: "observers", label: "觀察" },
  { key: "missed", label: "缺課" },
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

// ---- Avatars: photo when present, otherwise an initial-character seal ----

function Avatar({
  name,
  url,
  size = 26,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={`${name}的照片`}
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-full border border-rule object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-rule bg-paper-deep font-serif-tc text-ink-soft"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
    >
      {name.charAt(0)}
    </span>
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

function QuarterView() {
  const students = useQuery(api.students.byQuarter, {});
  const photos = useQuery(api.students.photoUrls);
  return (
    <StudentTable
      students={students}
      photos={photos}
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
        ["帶領日期", (s) => (s.leadingSessions ?? []).join("、"), "margin"],
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

function MissedView() {
  const students = useQuery(api.students.withMissed);
  const photos = useQuery(api.students.photoUrls);
  return (
    <div>
      <StudentTable
        students={students}
        photos={photos}
        markColumns
        columns={[
          ["名字", (s) => s.name, "serif"],
          ["團契", (s) => s.fellowship ?? ""],
          ["缺課", (s) => String(s.missed), "margin"],
        ]}
      />
      <BeatLegend />
    </div>
  );
}

// ---- Attendance beat line (the Missed view's marks) ----

function BeatMarks({
  s,
}: {
  s: Pick<Student, "class1" | "class2" | "class3" | "class4" | "class5">;
}) {
  const marks = [s.class1, s.class2, s.class3, s.class4, s.class5];
  const yes = marks.filter((m) => m === true).length;
  const no = marks.filter((m) => m === false).length;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="img"
      aria-label={`課堂出席：${yes} 堂出席、${no} 堂缺席`}
    >
      {marks.map((attended, i) => (
        <Mark key={i} state={attended === undefined ? "none" : attended ? "yes" : "no"} />
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
    <div className="flex gap-5 overflow-x-auto pb-4">
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
    class1?: boolean;
    class2?: boolean;
    class3?: boolean;
    class4?: boolean;
    class5?: boolean;
  },
>({
  students,
  columns,
  markColumns,
  photos,
}: {
  students: T[] | undefined;
  columns: [string, (s: T) => string, ColumnStyle?][];
  markColumns?: boolean;
  photos?: Record<string, string | null>;
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
    <div className="overflow-x-auto">
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
                課堂（一至五）
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
                    </span>
                  ) : (
                    (get(s) || "—")
                  )}
                </td>
              ))}
              {markColumns && (
                <td className="px-3 py-2.5">
                  <BeatMarks s={s} />
                </td>
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
