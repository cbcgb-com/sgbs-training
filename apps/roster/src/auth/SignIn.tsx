// 登入 / 註冊 — the two passwordless auth sheets.
//
// Sign-in is an email lookup (no password, no code). Registration ends
// with a 6-digit email code (see docs/designs/authentication/LLD.md).
// Both are styled as ruled ledger lines on the 和合本 scripture page.

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { signInWithToken } from "./session";

const ruledInput =
  "w-full border-0 border-b border-rule bg-transparent px-0 py-2 text-lg text-ink focus:border-vermilion focus:outline-none";

export function SignInSheet() {
  const signIn = useAction(api.auth.signIn);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signIn({ email });
      signInWithToken(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
setBusy(false);
    }
  }

  return (
    <div className="ink-in mx-auto max-w-md py-8">
      <p className="font-serif-tc text-xl font-bold leading-loose text-ink">
        「你當竭力在神面前得蒙喜悅，作無愧的工人，
        按著正意分解真理的道。」
      </p>
      <p className="mt-3 font-serif-tc text-xs tracking-[0.25em] text-vermilion">
        提摩太後書二章十五節
      </p>
      <form onSubmit={submit} className="mt-8">
        <label
          htmlFor="signin-email"
          className="font-serif-tc text-sm tracking-[0.2em] text-ink"
        >
          電子郵箱
        </label>
        <input
          id="signin-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className={ruledInput}
        />
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          填寫報名時登記的郵箱即可登入；無需密碼。尚未報名？請先於下方報名。
        </p>
        {error && <p className="mt-3 text-sm text-vermilion">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-8 w-full bg-ink py-3.5 font-serif-tc text-base font-bold tracking-[0.4em] text-paper transition-colors hover:bg-vermilion disabled:opacity-50 sm:w-auto sm:px-16"
        >
          {busy ? "…" : "登入"}
        </button>
      </form>
    </div>
  );
}

export function CodeStep({
  email,
  onVerified,
}: {
  email: string;
  onVerified: (token: string) => void;
}) {
  const verify = useMutation(api.auth.verifyRegistrationCode);
  const completeSignIn = useAction(api.auth.completeRegistrationSignIn);
  const requestCode = useMutation(api.auth.requestCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Two-step: the mutation consumes the code + creates the row, then
      // the node action signs the session JWT (crypto lives in actions).
      const res = await verifyWithStagedPayload(code);
      const session = await completeSignIn({
        email,
        codeIssuedAt: res.codeIssuedAt,
      });
      signInWithToken(session.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  // The staged payload is passed through a module-level variable set by
  // the registration sheet (avoids prop-drilling through two states).
  function verifyWithStagedPayload(inputCode: string) {
    const registration = stagedRegistration;
    if (!registration) throw new Error("請重新填寫報名表");
    return verify({
      email,
      code: inputCode,
      registration,
    });
  }

  async function resend() {
    setError(null);
    try {
      await requestCode({ email, name: stagedRegistration?.name });
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="ink-in mx-auto max-w-md py-8">
      <p className="font-serif-tc text-lg font-bold text-ink">
        請輸入六位驗證碼
      </p>
       <p className="mt-2 text-sm leading-relaxed text-ink-soft">
         已發送至 <span className="text-ink">{email}</span>。請於 15
         分鐘內輸入。
       </p>
      <form onSubmit={submit} className="mt-6">
        <input
          id="reg-code"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="●●●●●●"
          className={`${ruledInput} text-center font-serif-tc text-3xl tracking-[0.5em]`}
        />
        {error && <p className="mt-3 text-sm text-vermilion">{error}</p>}
        {resent && (
          <p className="mt-3 text-sm text-ink-soft">已重新發送驗證碼。</p>
        )}
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="mt-8 w-full bg-ink py-3.5 font-serif-tc text-base font-bold tracking-[0.4em] text-paper transition-colors hover:bg-vermilion disabled:opacity-50 sm:w-auto sm:px-16"
        >
          {busy ? "…" : "確認"}
        </button>
        <button
          type="button"
          onClick={resend}
          className="mt-4 block w-full text-center text-[13px] tracking-[0.2em] text-ink-soft underline-offset-4 hover:text-ink hover:underline sm:w-auto"
        >
          重新發送驗證碼
        </button>
      </form>
    </div>
  );
}

// ---- Staged payload handoff ----

export type StagedRegistration = {
  name: string;
  gender: string;
  fellowship: string;
  baptismTime: string;
  leadingExperience: string;
  confirmedAttendance: boolean;
  photoStorageId?: Id<"_storage">;
  quarter?: string;
};

let stagedRegistration: StagedRegistration | null = null;

export function stageRegistration(payload: StagedRegistration) {
  stagedRegistration = payload;
}

export function clearStagedRegistration() {
  stagedRegistration = null;
}