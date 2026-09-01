# Authentication & Roles — Low-Level Design

**Created**: 2026-08-30
**Revised**: 2026-08-31 — passwordless, self-hosted auth replaces Clerk
**HLD Link**: ../../high-level-design.md

## Overview

Authentication is self-hosted in Convex — there is no external identity
vendor. A member proves they own an email address **once**, at
registration, by confirming a 6-digit code sent to that address. After
that, signing in is simply typing the registered email address: no
password, no code, no vendor. The server trusts a signed session token
and derives the role from the email exactly as before.

Why this design: the roster email is already identity-authoritative —
it is the key for roles (instructors table), group contact sheets, and
homework emails. Registration already collected it under the honor
system; the one-time code merely proves the address is real and
reachable. Passwords were never wanted (the honor-system culture, an
older membership, no password-recovery flow to support). External
identity vendors (Clerk) were removed 2026-08-31: production OAuth
routing on a shared `*.vercel.app` domain is not supportable (see
Related Documents for the cutover history).

## Flows

### Registration (proves email ownership)

1. Member fills the registration form: name, gender, fellowship,
   baptism time, experience, attendance confirmation, photo.
2. Member enters an email address (pre-filled if self-registering
   after sign-in) and taps 送出驗證碼.
3. A Convex **node action** emails a 6-digit code to that address via
   SMTP (church Gmail account with an app password; no third-party
   auth vendor).
4. Member types the code; the record is created only after the code
   matches. The code is single-use, expires in 15 minutes, and is
   rate-limited per email address.
5. Success signs the member in immediately (same as sign-in below).

Instructors registering on behalf of someone else (登記另一位) follow
the same code-confirmation flow: instructor fills the form, the code
is emailed to the registrant's address, and whoever holds that inbox
confirms it to finalize the record. (An in-person signup without email
access falls back to the instructor reading the code aloud from the
registrant's phone.)

### Sign-in (no verification)

1. Member types their registered email address.
2. If the email matches any `students` row (any quarter) or an active
   `instructors` row, the server issues a session token. If not, the
   form says the address is not registered (報名後即可登入).
3. The client stores the session token and presents it to Convex as a
   custom JWT. Tokens are short-lived (12 h) and refreshed while the
   tab stays open; sign-out deletes the local token.

**Security property**: possession of no secret is claimed. Sign-in is
a lookup, not an authentication. This is an explicit product decision:
the sensitive surface (聯絡表 directory — fellow members' phones and
emails) is protected only by the social expectation that a lookup key
someone handed you (your small group) is not shared. Email verification
at sign-in would add friction to every returning member with no
security gain — anyone can receive a code at *their own* address; only
registration ties an address to a real person.

## Role Derivation

Unchanged from the original design. An identity's email maps to a role
in this order:

1. **Instructor** — an `instructors` table row with the same email AND
   `active: true`.
2. **Student** — otherwise, when a `students` row exists with that email
   and `quarter === CURRENT_QUARTER`.
3. **Authenticated guest** — signed in, no student record.

Helpers in `convex/students.ts`: `requireAuth`, `requireInstructor`
(active instructor or throws 僅限同工存取), `requireCurrentStudent`
(registered this quarter or throws 請先註冊本季課程).

## JWT / Session Design

Convex validates a **Custom JWT** issued by the app itself
(docs.convex.dev/auth/advanced/custom-jwt):

- `iss`: `https://sgbs-roster.vercel.app/` (constant; the app origin)
- `aud`: `"sgbs-roster"` (constant; a second app on the same issuer
  would need its own audience)
- `sub`: `email:<registered email>`
- `exp`: `now + 12h`, `iat`: `now`
- Claims surfaced to functions: `email` (the identity email),
  `name` (from the student/instructor row at issue time)

The signing key is an ES256 key pair. The **private key** lives in the
Convex environment variable `AUTH_PRIVATE_KEY` (node action only,
never bundled to the client). The **public key** is embedded in
`convex/auth.config.ts` as a `data:` URI JWKS — no key service is
needed.

`convex/auth.config.ts`:

```ts
{
  type: "customJwt",
  applicationID: "sgbs-roster",
  issuer: "https://sgbs-roster.vercel.app/",
  jwks: "data:application/json;base64,<public JWKS>",
  algorithm: "ES256",
}
```

Session lifecycle: the token is stored in `localStorage`
(`sgbs.auth.token`). The client passes an `Authorization: Bearer`
header via `ConvexClient.setAuth` (fetchAccessToken returns the stored
token; when it is past its 11th hour the client calls
`createSession` again transparently — the lookup is silent, so
refresh is invisible). Logout clears the storage entry.

No cookies, no refresh-token rotation: the blast radius of a stolen
token is the read of group contact info for one member, expiring in
12 h. Acceptable for this deployment; revisit if the app ever holds
financial or pastoral data.

## Data Models

### New tables

**authCodes** — registration email-verification codes.

| Field | Type | Notes |
| ------- | ------- | -------- |
| email | string | lowercased registrant address, indexed by_email |
| code | string | 6 digits, compared constant-time |
| name | optional string | requested name (for the email greeting) |
| createdAt | number | epoch ms |
| expiresAt | number | createdAt + 15 min |
| usedAt | optional number | set on consume (single-use) |

**sessions** — issued tokens, for audit and revocation.

| Field | Type | Notes |
| ------- | ------- | ------- |
| token | string | the full JWT id segment (jti) |
| email | string | indexed by_email |
| createdAt | number | |
| expiresAt | number | mirrors the JWT exp |
| revokedAt | optional number | set on sign-out (all devices) |

### Changed columns

- `students.email` — now identity-authoritative (was display).
- `students.clerkId` — retained as a legacy optional column so existing
  rows validate, but no longer written or read by any code path
  (identity is the email itself).

### Registration changes

`registerStudent` requires a verified code: the mutation takes
`code: string` and checks `authCodes` for an unused, unexpired code
matching email + code before inserting the student row. The
photo-upload flow is unchanged.

## Email sending

A Convex **node action** (`sendAuthCode`) sends the code via the
[Resend](https://resend.com) API (chosen over raw SMTP 2026-08-31 —
Eric has a Resend account; no app password, better tooling):

- `RESEND_API_KEY` — Resend API key (Convex env var only).
- `RESEND_FROM` — verified sender, e.g.
  `小組查經訓練 <roster@cbcgb.org>`. Resend's dev sender
  (`onboarding@resend.dev`) delivers ONLY to the account owner's own
  address; a custom sending domain (DNS SPF/DKIM records via the
  Resend dashboard) must be verified before opening registration to
  the congregation.
- Both variables live ONLY in the Convex deployment environment —
  never in the repo.
- Delivery target: whatever address the member typed. Failures return
  a friendly error; retry is free (regenerate the code).

## Functions

- `auth.requestCode` (mutation) — validate email shape, rate-limit
  (3 codes / 10 min / address), insert authCodes, schedule
  `auth.sendCodeEmail` node action.
- `auth.sendCodeEmail` (internal action) — SMTP send.
- `auth.verifyCode` (mutation) — consume the code, insert/update the
  student row (self-registration path), create a session, return the
  JWT + its expiry.
- `auth.signIn` (mutation) — email lookup per the Sign-in flow; create
  session, return JWT. Uniform failure for unknown emails (no user
  enumeration).
- `auth.signOut` (mutation) — mark the session revoked.
- `students.registerInstructorManaged` — as before (admin mode), now
  creating the same authCodes row for the registrant's email.

Legacy helpers unchanged; `clerkId` references removed.

## Token Configuration

`convex/auth.config.ts` declares the single customJwt provider above.
The dev and prod deployments share the same config (the same public
key); only `SMTP_*` environment values differ per deployment. No
per-deployment issuer override is needed — dev tokens are issued by
the same issuer string.

## Edge Cases

- **Multiple Google-free identities** — one email = one identity.
  The old two-Eric-accounts case (gmail + Google Workspace) collapses:
  whichever address was registered is the only credential. Instructors
  who want a second identity on another address need a second students
  row; role derivation (instructor first) still wins.
- **Instructor self-registration** — instructors register with code
  verification like everyone else (the registration email is also the
  homework email; it must be reachable).
- **Email correction after registration** — only via instructor CLI
  (`migrations:assignGroup` pattern). A typo'd address that passed
  verification (the member used a wrong-but-owned inbox) can be fixed
  by deactivating/reactivating with the corrected address. If the
  member never received the code, instructors can also register them
  directly (registerStudent vouches for the address).
- **Registered via Airtable, never self-verified** — pre-2026 rows with
  an email but no `authCodes` proof still sign in via lookup (Sign-in
  does not require a code). The code proof applies only to NEW
  registrations.
- **Student + instructor on one email**: instructor gate wins for
  viewing; the student record still exists.
- **Rate limiting** — 3 codes per address per 10 minutes; codes are
  single-use; expired codes are swept opportunistically.
- **SMTP outage → Resend outage** — registration is blocked, not
  silently broken: the request mutation surfaces 發送失敗，請稍後再試. Members
  can be registered by instructors (who vouch for the address);
  sign-in continues to work (it needs no email).

## Related Documents

- [High-Level Design](../../high-level-design.md)
- [Roles & Gating EARS](./roles-EARS.md)
- History: the Clerk production cutover (app-proxy via /__clerk edge
  function) was reverted in this design; the GCP OAuth client project
  `sgbs-roster-auth` (consent screen 小組查經帶領訓練) remains dormant
  and can be reused if a self-hosted "Continue with Google" button is
  ever added.