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

export const sendCodeEmail = internalAction({
  args: { email: v.string(), code: v.string(), name: v.optional(v.string()) },
  handler: async (_ctx, { email, code, name }) => {
    const { SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error("SMTP_USER / SMTP_PASS are not set on this deployment");
    }
    const from = SMTP_FROM ?? `小組查經訓練 <${SMTP_USER}>`;
    const greeting = name ? `${name}，平安！` : "平安！";

    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    try {
      await transport.sendMail({
        from,
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
