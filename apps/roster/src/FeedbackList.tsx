import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { CURRENT_QUARTER, QUARTERS } from "./constants";
import { FEEDBACK_QUESTIONS, FEEDBACK_TITLE } from "./feedbackFields";
import { zhDate } from "./withdrawal";

// Instructor list of 小組查經帶領訓練反思. Quarter filter; each slip is
// one student's four answers. See docs/designs/feedback/LLD.md.
export default function FeedbackList() {
  const [quarter, setQuarter] = useState<string>(CURRENT_QUARTER);
  const rows = useQuery(api.feedback.byQuarter, { quarter });

  const quarters = useMemo(() => [...QUARTERS].slice().reverse(), []);

  if (rows === undefined) {
    return (
      <p className="py-12 text-center font-serif-tc text-sm tracking-[0.3em] text-ink-soft">
        載入中……
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-ink pb-4">
        <h2 className="font-serif-tc text-2xl font-bold tracking-[0.15em] text-ink">
          {FEEDBACK_TITLE}
        </h2>
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
          </select>
        </label>
      </div>

      <p className="mt-3 text-sm text-ink-soft">
        {rows.length === 0
          ? `${quarter} 尚未收到反思`
          : `${quarter} · ${rows.length} 份`}
      </p>

      {rows.length === 0 ? (
        <p className="py-14 text-center font-serif-tc text-base tracking-[0.25em] text-ink-soft">
          本季尚未收到反思
        </p>
      ) : (
        <ol className="mt-6 space-y-10">
          {rows.map((row) => (
            <li key={row._id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-3">
                <p className="font-serif-tc text-lg font-bold tracking-[0.1em] text-ink">
                  {row.name || "（已刪除的學員）"}
                </p>
                <p className="text-[13px] text-ink-soft">
                  {[row.groupName, row.fellowship].filter(Boolean).join(" · ") ||
                    "未分組"}
                  {` · ${zhDate(row.submittedAt)}`}
                  {row.updatedAt !== row.submittedAt
                    ? `（改於 ${zhDate(row.updatedAt)}）`
                    : ""}
                </p>
              </div>
              <dl className="mt-4 space-y-3 border-l border-gold/70 pl-4 text-sm">
                {FEEDBACK_QUESTIONS.map((q) => (
                  <div key={q.key}>
                    <dt className="font-serif-tc font-bold tracking-[0.1em] text-ink">
                      {q.label}
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
                      {row[q.key]}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
