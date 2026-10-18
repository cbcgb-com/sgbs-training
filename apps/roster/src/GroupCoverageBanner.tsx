import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { coverageBannerText } from "./groupCoverage";
import { useTab } from "./App";

export default function GroupCoverageBanner({
  scheduleLink,
}: {
  scheduleLink?: boolean;
}) {
  const alerts = useQuery(api.groupCoverage.alerts);
  if (alerts === undefined) return null;
  if (alerts.length === 0) return null;

  return (
    <aside
      role="status"
      className="mb-6 border border-vermilion/40 bg-paper-deep/50 px-4 py-4"
    >
      <p className="font-serif-tc text-sm font-bold tracking-[0.15em] text-vermilion">
        有小組人數不足，需要合併
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        合併須由同工確認，合併後有效至本季結束。剩餘課堂的主領／觀察會清空，由新組重排。
      </p>
      <div className="mt-3 space-y-3">
        {alerts.map((alert) => (
          <MergeCard
            key={alert.groupName}
            alert={alert}
            scheduleLink={scheduleLink}
          />
        ))}
      </div>
    </aside>
  );
}

type Alert = {
  groupName: string;
  memberCount: number;
  members: { _id: string; name: string }[];
  proposedTarget: string | null;
  otherGroups: { groupName: string; memberCount: number }[];
};

function MergeCard({
  alert,
  scheduleLink,
}: {
  alert: Alert;
  scheduleLink?: boolean;
}) {
  const merge = useMutation(api.groupCoverage.mergeGroups);
  const { setTab } = useTab();
  const [target, setTarget] = useState(
    alert.proposedTarget ?? alert.otherGroups[0]?.groupName ?? "",
  );
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const names = alert.members.map((m) => m.name).join("、") || "（無）";

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      const res = await merge({ from: alert.groupName, to: target });
      setDone(`已併入「${res.target}」，現有 ${res.targetCount} 人`);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="border border-rule bg-paper px-3 py-3">
        <p className="font-serif-tc text-sm text-ink">{done}</p>
      </div>
    );
  }

  return (
    <div className="border border-rule bg-paper px-3 py-3">
      <p className="font-serif-tc text-[15px] font-bold text-ink">
        {coverageBannerText(alert.groupName, alert.memberCount)}
      </p>
      <p className="mt-1 text-sm text-ink-soft">目前組員：{names}</p>
      {alert.otherGroups.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">沒有其他小組可合併</p>
      ) : confirming ? (
        <div className="mt-3">
          <p className="font-serif-tc text-sm text-ink">
            將「{alert.groupName}」併入「{target}」，本季剩餘課堂的主領／觀察會清空後重排。確定合併？
          </p>
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
              {busy ? "處理中" : "確認合併"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="border border-rule px-3 py-1 font-serif-tc text-xs font-bold tracking-[0.15em] text-ink transition-colors hover:border-ink disabled:opacity-50"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="font-serif-tc text-sm text-ink-soft">
            合併到
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label={`${alert.groupName} 合併目標`}
              className="ml-2 cursor-pointer border border-rule bg-paper px-2 py-1 text-sm text-ink focus:border-ink focus:outline-none"
            >
              {alert.otherGroups.map((g) => (
                <option key={g.groupName} value={g.groupName}>
                  {g.groupName}（{g.memberCount} 人）
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            disabled={!target}
            className="border border-vermilion bg-ink px-3 py-1 font-serif-tc text-xs font-bold tracking-[0.15em] text-paper transition-colors hover:bg-vermilion disabled:opacity-50"
          >
            合併
          </button>
          {scheduleLink && (
            <button
              type="button"
              onClick={() => setTab("schedule")}
              className="font-serif-tc text-xs tracking-[0.1em] text-ink-soft underline underline-offset-4 hover:text-vermilion"
            >
              前往課堂安排
            </button>
          )}
        </div>
      )}
    </div>
  );
}
