// 退出報名 shared helpers (withdrawal form + view), used by both the
// student's own 我的資料 sheet and the instructor's roster controls so the
// two sides cannot drift. See docs/designs/withdrawal/LLD.md.

import { WITHDRAWAL_REASON_OTHER } from "./constants";

// The optional reason is a dropdown plus a free-text box revealed when 其他
// is chosen. Blank = no reason recorded.
export function withdrawReasonValue(
  choice: string,
  other: string,
): string | undefined {
  if (choice === WITHDRAWAL_REASON_OTHER) return other.trim() || undefined;
  return choice || undefined;
}

// Epoch ms → 2026-09-17 (ledger-consistent, locale-independent).
export function zhDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
