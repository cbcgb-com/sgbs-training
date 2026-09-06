"use node";

// Verification-code email delivery over Gmail SMTP (nodemailer). Kept in
// its own "use node" file because SMTP needs Node's net/tls stack, which
// the default V8 runtime (used by auth.ts's mutations) does not provide.
// Replaced the Resend API 2026-09-04 — the church's own Gmail mailbox
// (no-reply-com@cbcgb.org) sends the codes. See
// docs/designs/authentication/LLD.md ("Email sending").
//
// Env vars (Convex deployment environment only — never in the repo):
// - SMTP_USER — sending mailbox, e.g. no-reply-com@cbcgb.org
// - SMTP_PASS — Google App Password for that mailbox (login passwords
//   are refused by Gmail over SMTP)
// - SMTP_FROM — optional display-sender override (defaults to SMTP_USER)
// - SMTP_HOST — optional (defaults to smtp.gmail.com:465, implicit TLS)

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import nodemailer from "nodemailer";
import {
  CURRENT_QUARTER,
  CURRENT_QUARTER_SESSION_DATES,
} from "../src/constants";

// Welcome-email class facts derive from the shared constants so a new
// quarter cannot silently send stale dates. The clock time is not part
// of the sessions data — update here if the announced time changes.
const FIRST_CLASS_TIME = "下午3:00";

const CN_MONTHS = [
  "", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二",
];

// "2026-09-20" → "9月20日（主日）" — Sunday renders as 主日, weekdays as 週一…
function zhDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = ["日", "一", "二", "三", "四", "五", "六"][
    new Date(y, m - 1, d).getDay()
  ];
  return `${m}月${d}日（${wd === "日" ? "主日" : `週${wd}`}）`;
}

// "2026-09-20" → "9月20日" (no weekday label, for date ranges)
function zhDatePlain(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}月${d}日`;
}

// "2026-09-20" → "9/20"
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}

// "2026秋季" → "2026 秋季"
function quarterLabel(q: string): string {
  return `${q.slice(0, 4)} ${q.slice(4)}`;
}

// Shared SMTP plumbing — one transport builder, one sender line, used by
// both the verification-code and welcome emails.
function makeTransport() {
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP_USER / SMTP_PASS are not set on this deployment");
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function senderAddress() {
  const { SMTP_USER, SMTP_FROM } = process.env;
  return SMTP_FROM ?? `小組查經訓練 <${SMTP_USER}>`;
}

export const sendCodeEmail = internalAction({
  args: { email: v.string(), code: v.string(), name: v.optional(v.string()) },
  handler: async (_ctx, { email, code, name }) => {
    const greeting = name ? `${name}，平安！` : "平安！";
    const transport = makeTransport();

    try {
      await transport.sendMail({
        from: senderAddress(),
        to: email,
        subject: `小組查經訓練報名驗證碼：${code}`,
        text: [
          greeting,
          "",
          `您的報名驗證碼是 ${code}。`,
          "請在本頁輸入此六位數字以完成報名。驗證碼 15 分鐘內有效。",
          "",
          "若您並未嘗試報名，請忽略此郵件。",
          "",
          "小組查經訓練主日學 · CBCGB",
        ].join("\n"),
        html: [
          `<p style="font-size:15px">${greeting}</p>`,
          `<p style="font-size:15px">您的報名驗證碼是：</p>`,
          `<p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#b3402a">${code}</p>`,
          `<p style="font-size:13px;color:#555">請在本頁輸入此六位數字以完成報名。驗證碼 15 分鐘內有效。</p>`,
          `<p style="font-size:13px;color:#555">若您並未嘗試報名，請忽略此郵件。</p>`,
          `<p style="font-size:13px;color:#555">小組查經訓練主日學 · CBCGB</p>`,
        ].join(""),
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `發送驗證碼失敗：請稍後再試或聯絡同工。${detail.slice(0, 140)}`,
      );
    }
  },
});

// Welcome email: sent once, when a student row is first created for the
// current quarter (scheduled from auth.verifyRegistrationCode on the
// "created" path only — duplicates and returning members re-verifying
// stay silent). Brief by design: confirm the registration, name the
// first class, point at the course site.
export const sendWelcomeEmail = internalAction({
  args: { email: v.string(), name: v.optional(v.string()) },
  handler: async (_ctx, { email, name }) => {
    const greeting = name ? `${name}，平安！` : "平安！";
    const dates = CURRENT_QUARTER_SESSION_DATES;
    const first = dates[0];
    const last = dates[dates.length - 1];
    const firstMonth = CN_MONTHS[Number(first.split("-")[1])];
    const quarter = quarterLabel(CURRENT_QUARTER);

    const subject = `歡迎報名小組查經訓練主日學（${shortDate(first)} 開課）`;
    const text = [
      greeting,
      "",
      `您的報名已收到——歡迎加入 ${quarter}小組查經訓練主日學！`,
      "",
      `第一堂課：${zhDate(first)}${FIRST_CLASS_TIME}`,
      "地點：CBCGB 城光堂三樓",
      "",
      `課程共${dates.length}週，每週主日（${zhDatePlain(first)}至${zhDatePlain(last)}）。` +
        "若您希望取得完成記錄，請至少出席四堂。",
      "課程資訊與講義：https://cbcgb-com.github.io/sgbs-training/",
      "",
      `期待${firstMonth}月在課堂相見！若有任何問題，歡迎聯絡同工。`,
      "",
      "小組查經訓練主日學 · CBCGB",
    ].join("\n");
    const html = [
      `<p style="font-size:15px">${greeting}</p>`,
      `<p style="font-size:15px">您的報名已收到——歡迎加入 <b>${quarter}小組查經訓練主日學</b>！</p>`,
      `<p style="font-size:15px">第一堂課：<span style="color:#b3402a;font-weight:bold">${zhDate(first)}${FIRST_CLASS_TIME}</span><br>地點：CBCGB 城光堂三樓</p>`,
      `<p style="font-size:13px;color:#555">課程共${dates.length}週，每週主日（${zhDatePlain(first)}至${zhDatePlain(last)}）。若您希望取得完成記錄，請至少出席四堂。</p>`,
      `<p style="font-size:13px;color:#555">課程資訊與講義：<a href="https://cbcgb-com.github.io/sgbs-training/">https://cbcgb-com.github.io/sgbs-training/</a></p>`,
      `<p style="font-size:13px;color:#555">期待${firstMonth}月在課堂相見！若有任何問題，歡迎聯絡同工。</p>`,
      `<p style="font-size:13px;color:#555">小組查經訓練主日學 · CBCGB</p>`,
    ].join("");

    const transport = makeTransport();
    // Convex runs scheduled actions AT MOST ONCE — no automatic retry —
    // so a transient SMTP blip would silently drop the note. Retry a
    // little here. Registration itself is unaffected either way: the
    // student row is already committed when this action runs.
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await transport.sendMail({
          from: senderAddress(),
          to: email,
          subject,
          text,
          html,
        });
        return;
      } catch (err) {
        lastErr = err;
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
      }
    }
    const detail = lastErr instanceof Error ? lastErr.message : String(lastErr);
    throw new Error(`發送歡迎郵件失敗（不影響報名）：${detail.slice(0, 140)}`);
  },
});
