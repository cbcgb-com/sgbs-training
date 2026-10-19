import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useTab } from "./tab";
import { CURRENT_QUARTER } from "./constants";
import {
  EMPTY_FEEDBACK_ANSWERS,
  FEEDBACK_QUESTIONS,
  FEEDBACK_TEXT_MAX,
  FEEDBACK_TITLE,
  type FeedbackAnswers,
} from "./feedback";

// 小組查經帶領訓練反思: the signed-in student's end-of-term reflection.
// Four required free-text questions from the original Google Form.
// See docs/designs/feedback/LLD.md.
export default function Feedback() {
  const status = useQuery(api.feedback.mine);
  const submit = useMutation(api.feedback.submit);
  const { setTab } = useTab();

  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState<FeedbackAnswers>(EMPTY_FEEDBACK_ANSWERS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  if (status === undefined) {
    return (
      <p className="py-12 text-center font-serif-tc text-sm tracking-[0.3em] text-ink-soft">
        載入中……
      </p>
    );
  }

  if (!status.registered) {
    return (
      <div className="py-10 text-center">
        <p className="font-serif-tc text-lg font-bold text-ink">
          本季度尚未登記
        </p>
        <p className="mt-3 text-base text-ink-soft">
          註冊本季課程後，即可在此寫下期末反思。
        </p>
        <button
          onClick={() => setTab("register")}
          className="mt-8 bg-ink px-10 py-3 font-serif-tc text-sm font-bold tracking-[0.3em] text-paper transition-colors hover:bg-vermilion"
        >
          前往註冊
        </button>
      </div>
    );
  }

  const existing = status.response;
  const showThanks = !!existing && !editing;

  function startEdit() {
    setAnswers(existing ?? EMPTY_FEEDBACK_ANSWERS);
    setError(null);
    setJustSaved(false);
    setEditing(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submit(answers);
      setJustSaved(true);
      setEditing(false);
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  if (showThanks) {
    return (
      <div className="ink-in mx-auto max-w-xl py-6 text-center">
        <p className="font-serif-tc pl-[0.4em] text-4xl font-black tracking-[0.4em] text-ink sm:text-5xl">
          謝謝
        </p>
        <p className="mt-6 text-sm leading-relaxed text-ink-soft">
          {justSaved
            ? `已收到您的反思（${status.quarter}）。本季課程結束前，如想補充，可以再改。`
            : `您已寫過 ${status.quarter} 的反思。本季課程結束前，如想補充，可以再改。`}
        </p>
        <button
          type="button"
          onClick={startEdit}
          className="mt-8 border border-rule px-8 py-2.5 font-serif-tc text-sm font-bold tracking-[0.2em] text-ink transition-colors hover:border-ink"
        >
          修改回覆
        </button>
        <div className="mx-auto mt-10 max-w-md border-t border-gold/60 pt-8">
          <p className="font-serif-tc text-[15px] leading-loose text-ink">
            「你當竭力在神面前得蒙喜悅，作無愧的工人，
            按著正意分解真理的道。」
          </p>
          <p className="mt-3 font-serif-tc text-sm tracking-[0.25em] text-vermilion">
            提摩太後書二章十五節
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl">
      <div className="border-b-2 border-ink pb-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif-tc text-2xl font-bold tracking-[0.15em] text-ink">
            {FEEDBACK_TITLE}
          </h2>
          <span className="font-serif-tc text-sm font-bold text-vermilion">
            {status.quarter || CURRENT_QUARTER}
          </span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          四題必填，寫下你這季的領受即可。沒有標準答案；同工會讀，用來改進下一季。
        </p>
      </div>

      <div className="mt-2 space-y-7">
        {FEEDBACK_QUESTIONS.map((q) => (
          <RuledField key={q.key} id={`fb-${q.key}`} label={q.label} required>
            <textarea
              id={`fb-${q.key}`}
              required
              maxLength={FEEDBACK_TEXT_MAX}
              rows={4}
              value={answers[q.key]}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
              }
              className={ruledTextarea}
            />
          </RuledField>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-8 border-t border-vermilion pt-3 font-serif-tc text-sm tracking-[0.05em] text-vermilion"
        >
          {error}
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ink py-3.5 font-serif-tc pl-[0.4em] text-base font-bold tracking-[0.4em] text-paper transition-colors hover:bg-vermilion disabled:opacity-50 sm:w-auto sm:px-16"
        >
          {submitting ? "遞交中" : existing ? "保存" : "遞交"}
        </button>
        {existing && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={submitting}
            className="border border-rule px-8 py-2.5 font-serif-tc text-sm font-bold tracking-[0.2em] text-ink transition-colors hover:border-ink disabled:opacity-50"
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
}

// Unobtrusive slip on 我的資料: last lesson has arrived, or they already
// wrote. Hidden while they are mid-edit on the profile ledger.
export function FeedbackPrompt() {
  const status = useQuery(api.feedback.mine);
  const { setTab } = useTab();
  if (!status?.registered) return null;
  if (!status.showPrompt && !status.response) return null;

  return (
    <div className="ink-in mt-6 border border-gold/60 bg-paper-deep/60 px-4 py-3">
      <p className="font-serif-tc text-sm font-bold text-ink">{FEEDBACK_TITLE}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
        {status.response
          ? "您已寫過本季反思。如想補充，可以再改。"
          : "課程近尾聲，歡迎寫下本季的反思，幫助下一季的學員。"}
      </p>
      <button
        type="button"
        onClick={() => setTab("feedback")}
        className="mt-2 font-serif-tc text-sm tracking-[0.1em] text-vermilion underline underline-offset-4 hover:text-ink"
      >
        {status.response ? "查看或修改反思" : "前往反思"}
      </button>
    </div>
  );
}

function friendlyError(msg: string): string {
  if (/[\u4e00-\u9fff]/.test(msg)) return msg;
  return "遞交失敗，請檢查網路後重試；若持續失敗請聯絡同工。";
}

// Same ledger line as Form.tsx / MyProfile.tsx; min-height only so a
// reflection can be more than one line.
const ruledTextarea =
  "w-full min-h-[6.5rem] resize-y rounded-none border-0 border-b border-rule bg-transparent px-0 py-2 text-base leading-relaxed text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none focus:ring-0";

function RuledField({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-serif-tc text-[15px] font-bold tracking-[0.1em] text-ink"
      >
        {label}
        {required && (
          <span className="ml-1 text-vermilion" aria-hidden>
            ＊
          </span>
        )}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
