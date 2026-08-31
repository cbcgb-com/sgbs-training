# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase: Vite + React 19 + Tailwind CSS 4 + Convex (backend) on
Vercel. Migrated from Airtable (base appPjFf1hVqSChSyo, table 学员名单).

## Users

- **Students**: Chinese-speaking members/friends of City Light Church (a CBCGB
  ministry) in Boston registering for the small-group Bible-study training
  (小組查經訓練). Fill the registration form equally on phones and desktops.
- **Admins/teachers**: training coordinators browsing the 284-student roster,
  checking attendance, homework submissions, leading/observing schedules per
  quarter. Desktop-leaning but phone-capable.

## Product Purpose

Replace the Airtable base 小组查经训练主日学 with a self-hosted tool the
church controls: a public registration form (per quarter) and a roster browser
implementing the original 12 views (Master, current quarter, leading
experience, leaders, observers, homework, missed classes, and 4 kanban
boards). Success: students register without friction; coordinators see the
training state at a glance; the church owns its data.

## Positioning

The church's own tool for its signature discipleship training program —
not a generic form SaaS. It carries the ministry's name (小組查經訓練主日學)
and its data continuity back to 2015.

## Operating Context

- Church community: City Light Church (citylight.life), a Chinese Christian
  church in Boston; communication mixes Traditional/Simplified Chinese and
  English names.
- The tool lives alongside the church website; coordinators announce the form
  via WeChat/fellowship channels (link opens on phones).
- Training runs in quarters (e.g. 2026秋季); records date back to 2015秋季.
- Google Docs (driven by the collected email addresses) is part of the
  workflow — hence the form's help text about choosing a Google-login email.

## Capabilities and Constraints

- Convex requires ASCII field names; documents use English keys, UI shows
  Chinese labels.
- Data migrated with resolved display values for linked fields; `Missed`
  formula and homework count replicated server-side (verified against all
  284 records).
- The registration mutation is public by design (like the Airtable form);
  spam protection undecided.
- Current quarter is a constant (src/constants.ts) pending automation.

## Brand Commitments

- Visual identity should sit alongside **citylight.life**: Astra global
  palette gold #efc14a / muted gold #e1be68 / deep warm black #171207 /
  cream #fffbf2, Montserrat for Latin type. (User-designated reference,
  2026-08-30.)
- Chinese typography must be first-class (Traditional Chinese headings;
  mixed Simplified data).
- The tool serves a church ministry: dignified, welcoming, no commercial
  hype.

## Evidence on Hand

- 284 real student records (names, fellowships, emails, quarters 2015-2026),
  Airtable schema, and the live Airtable form for field parity — all local in
  airtable_dump/.

## Product Principles

1. The roster is a ministry record: clarity and dignity over decoration.
2. Registration must be effortless on a phone in a church hallway.
3. Chinese-first presentation; English/Latin is secondary.
4. Data fidelity to the Airtable source is non-negotiable.
