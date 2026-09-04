// Self-hosted passwordless auth: email-verified registration + email-lookup
// sign-in, with the app issuing its own ES256 session JWTs (see
// docs/designs/authentication/LLD.md).
//
// Two constants matter: ISSUER and AUDIENCE must match
// convex/auth.config.ts exactly — Convex rejects tokens on any mismatch.

import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { CURRENT_QUARTER } from "../src/constants";
import { SignJWT, importPKCS8 } from "jose";

const ISSUER = "https://sgbs-training.citylight.life/";
const AUDIENCE = "sgbs-roster";
const CODE_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
// 3 codes per address per 10 minutes.
const CODE_RATE_LIMIT = { count: 3, windowMs: 10 * 60 * 1000 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Constant-time-ish comparison: same-length compare over char codes.
function codesMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---- JWT issuance (node action; the private key never leaves here) ----
//
// Mutations cannot use cryptographic randomness (Convex restriction), so
// token signing happens here in node actions. The actions verify their
// preconditions via runQuery (a consumed code / an existing roster row)
// so the unauthenticated action surface cannot mint tokens arbitrarily.

async function issueSessionToken(email: string, name: string): Promise<{
  token: string;
  expiresAt: number;
  jti: string;
}> {
  const pkcs8 = process.env.AUTH_PRIVATE_KEY;
  if (!pkcs8) throw new Error("AUTH_PRIVATE_KEY is not set on this deployment");
  const key = await importPKCS8(pkcs8.replace(/\\n/g, "\n"), "ES256");
  const jti = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const token = await new SignJWT({ email, name })
    .setProtectedHeader({ alg: "ES256", typ: "JWT", kid: "sgbs-roster-session-1" })
    .setSubject(`email:${email}`)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setJti(jti)
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(key);
  return { token, expiresAt, jti };
}

// ---- Schemas ----

const codeArgs = {
  email: v.string(),
  code: v.string(),
  name: v.optional(v.string()),
};

// 1. Member requests a code for their registration email. Rate-limited.
export const requestCode = mutation({
  args: { email: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, { email, name }) => {
    const addr = normalizeEmail(email);
    if (!EMAIL_RE.test(addr)) throw new Error("請填寫有效的電子郵箱");

    const recent = await ctx.db
      .query("authCodes")
      .withIndex("by_email", (q) => q.eq("email", addr))
      .collect()
      .then((rows) =>
        rows.filter((r) => Date.now() - r.createdAt < CODE_RATE_LIMIT.windowMs),
      );
    if (recent.length >= CODE_RATE_LIMIT.count) {
      throw new Error("驗證碼請求過於頻繁，請稍後再試。");
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = Date.now();
    await ctx.db.insert("authCodes", {
      email: addr,
      code,
      name: name?.trim() || undefined,
      createdAt: now,
      expiresAt: now + CODE_TTL_MS,
    });
    await ctx.scheduler.runAfter(0, internal.auth.sendCodeEmail, {
      email: addr,
      code,
      name: name?.trim() || undefined,
    });
    return { sent: true };
  },
});

// 2. Node action: email the code via the Resend API. The deployment's
//    RESEND_API_KEY does the auth; RESEND_FROM is the verified
//    sender (e.g. "小組查經訓練 <roster@cbcgb.org>"). With no custom
//    domain verified, Resend only delivers to the account owner's own
//    address (onboarding@resend.dev sender) — set the domain before
//    opening registration to the congregation.
export const sendCodeEmail = internalAction({
  args: { email: v.string(), code: v.string(), name: v.optional(v.string()) },
  handler: async (_ctx, { email, code, name }) => {
    const { RESEND_API_KEY, RESEND_FROM } = process.env;
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set on this deployment");
    const from = RESEND_FROM ?? "小組查經訓練 <onboarding@resend.dev>";
    const greeting = name ? `${name}，平安！` : "平安！";

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
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
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      throw new Error(`發送驗證碼失敗（${resp.status}）：請稍後再試或聯絡同工。${detail.slice(0, 140)}`);
    }
  },
});

// 3. Consume the code → finalize the registration payload. Creates the
//    student row and returns the code's issuedAt, which the client then
//    passes to completeRegistrationSignIn (a node action — JWT signing
//    needs cryptographic randomness, unavailable in mutations).
export const verifyRegistrationCode = mutation({
  args: {
    email: v.string(),
    code: v.string(),
    registration: v.object({
      name: v.string(),
      gender: v.string(),
      fellowship: v.string(),
      baptismTime: v.string(),
      leadingExperience: v.string(),
      confirmedAttendance: v.boolean(),
      photoStorageId: v.optional(v.id("_storage")),
      quarter: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { email, code, registration }): Promise<{
    status: "created" | "duplicate";
    codeIssuedAt: number;
  }> => {
    const addr = normalizeEmail(email);
    if (!EMAIL_RE.test(addr)) throw new Error("請填寫有效的電子郵箱");

    const rows = await ctx.db
      .query("authCodes")
      .withIndex("by_email", (q) => q.eq("email", addr))
      .collect();
    const now = Date.now();
    const match = rows.find(
      (r) =>
        r.usedAt === undefined &&
        r.expiresAt > now &&
        codesMatch(r.code, code.trim()),
    );
    if (!match) throw new Error("驗證碼無效或已過期，請重新輸入或重新發送。");
    await ctx.db.patch(match._id, { usedAt: now });

    if (!registration.confirmedAttendance) {
      throw new Error("請確認您可以出席至少4堂課");
    }
    const name = registration.name.trim();
    if (!name) throw new Error("缺少必填欄位：name");
    const quarter = registration.quarter ?? CURRENT_QUARTER;

    const existing = await ctx.db
      .query("students")
      .withIndex("by_email", (q) => q.eq("email", addr))
      .collect();
    const duplicate = existing.find((s) => s.quarter === quarter);
    if (!duplicate) {
      await ctx.db.insert("students", {
        name,
        gender: registration.gender,
        fellowship: registration.fellowship,
        email: addr,
        baptismTime: registration.baptismTime,
        leadingExperience: registration.leadingExperience,
        quarter,
        present: false,
        missed: 0,
        homeworkSubmitted: [],
        homeworkCount: 0,
        photoStorageId: registration.photoStorageId,
        source: "form",
      });
    }
    return {
      status: duplicate ? ("duplicate" as const) : ("created" as const),
      codeIssuedAt: match.createdAt,
    };
  },
});

// 3b. Node action: complete registration sign-in. The precondition check
//     (a code for this email was issued AND consumed) runs via runQuery
//     so this unauthenticated action cannot mint tokens for unverified
//     addresses.
export const completeRegistrationSignIn = action({
  args: { email: v.string(), codeIssuedAt: v.number() },
  handler: async (ctx, { email, codeIssuedAt }): Promise<{
    token: string;
    expiresAt: number;
  }> => {
    const addr = normalizeEmail(email);
    const rows = await ctx.runQuery(internal.auth.getCodesByEmail, {
      email: addr,
    });
    const consumed = rows.find(
      (r) => r.createdAt === codeIssuedAt && r.usedAt !== undefined,
    );
    if (!consumed) throw new Error("驗證碼尚未確認");
    const students = await ctx.runQuery(internal.auth.getStudentByEmail, {
      email: addr,
    });
    const name = students[0]?.name ?? "";
    return await issueSessionToken(addr, name);
  },
});

// 4. Sign-in: pure email lookup, no verification. Uniform rejection for
//    unknown/malformed addresses (no user enumeration). Node action —
//    existence check via runQuery, JWT signing needs node crypto.
export const signIn = action({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<{
    token: string;
    expiresAt: number;
  }> => {
    const addr = normalizeEmail(email);
    if (!EMAIL_RE.test(addr)) throw new Error("此電子郵箱尚未註冊");

    const instructor = await ctx.runQuery(internal.auth.getInstructorByEmail, {
      email: addr,
    });
    let name: string | null = instructor?.name ?? null;
    let exists = instructor?.active === true;

    if (!exists) {
      const students = await ctx.runQuery(internal.auth.getStudentByEmail, {
        email: addr,
      });
      if (students.length) {
        exists = true;
        name = students[0].name;
      }
    }
    if (!exists) throw new Error("此電子郵箱尚未註冊");

    return await issueSessionToken(addr, name ?? "");
  },
});

// Internal lookups + session recording used by the actions above.
export const getCodesByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<Array<Doc<"authCodes">>> => {
    return await ctx.db
      .query("authCodes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
  },
});

export const getStudentByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<Array<Doc<"students">>> => {
    return await ctx.db
      .query("students")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
  },
});

export const getInstructorByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<Doc<"instructors"> | null> => {
    return await ctx.db
      .query("instructors")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
  },
});

export const recordSession = internalMutation({
  args: {
    jti: v.string(),
    email: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, { jti, email, expiresAt }) => {
    await ctx.db.insert("authSessions", {
      jti,
      email,
      createdAt: Date.now(),
      expiresAt,
    });
  },
});

// 5. Sign-out: revoke server-side so a copied token dies too.
export const signOut = mutation({
  args: { jti: v.string() },
  handler: async (ctx, { jti }) => {
    const row = await ctx.db
      .query("authSessions")
      .withIndex("by_jti", (q) => q.eq("jti", jti))
      .unique();
    if (row && row.revokedAt === undefined) {
      await ctx.db.patch(row._id, { revokedAt: Date.now() });
    }
  },
});

// Optional sweep (CLI or scheduled): delete consumed/expired codes.
export const sweepCodes = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    let removed = 0;
    for (const row of await ctx.db.query("authCodes").collect()) {
      if (row.usedAt !== undefined || row.expiresAt < now) {
        await ctx.db.delete(row._id);
        removed++;
      }
    }
    return { removed };
  },
});