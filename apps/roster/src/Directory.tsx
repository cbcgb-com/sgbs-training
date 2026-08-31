import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { CURRENT_QUARTER } from "./constants";

// 聯絡表: the class contact directory. Signed-in members only.
export default function Directory({
  isInstructor = false,
}: {
  isInstructor?: boolean;
}) {
  const directory = useQuery(api.students.directory);
  const [quarter, setQuarter] = useState<string>(CURRENT_QUARTER);

  const quarters = useMemo(() => {
    if (!directory) return [];
    return [...new Set(directory.map((d) => d.quarter))]
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
  }, [directory]);

  if (!directory) {
    return (
      <p className="py-12 text-center font-serif-tc text-sm tracking-[0.3em] text-ink-soft">
        載入中……
      </p>
    );
  }

  const filtered = isInstructor
    ? quarter === "all"
      ? directory
      : directory.filter((d) => d.quarter === quarter)
    : directory.filter((d) => d.quarter === CURRENT_QUARTER);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-ink pb-4">
        <h2 className="font-serif-tc text-2xl font-bold tracking-[0.15em] text-ink">
          聯絡表
        </h2>
        {isInstructor ? (
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
        ) : (
          <span className="font-serif-tc text-sm font-bold text-vermilion">
            {CURRENT_QUARTER}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-14 text-center font-serif-tc text-base tracking-[0.25em] text-ink-soft">
          本季度尚無記錄
        </p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-left text-base tabular-nums">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="th-double w-10 px-1 py-2.5">
                  <span className="sr-only">序號</span>
                </th>
                {["名字", "團契", "小組", "季度", "郵箱"].map((label) => (
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
              {filtered.map((s, i) => (
                <tr
                  key={s._id}
                  className="border-b border-rule transition-colors hover:bg-paper-deep/60"
                >
                  <td className="px-1 py-2.5 text-right font-serif-tc text-sm text-vermilion">
                    {i + 1}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-serif-tc text-[17px] font-bold text-ink">
                    {s.name}
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
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-right text-sm text-ink-soft tabular-nums">
            共 {filtered.length} 條記錄
          </p>
        </div>
      )}
    </div>
  );
}
