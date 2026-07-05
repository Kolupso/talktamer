# TalkTamer — Build Plan

A debate-management app with three synchronized browser windows:
1. **Manager dashboard** — the chairman controls everything here
2. **Waiting list display** — public screen showing who speaks next
3. **Countdown display** — public screen showing the current speaker's timer

**Stack:** React + Vite + TypeScript · Supabase (Postgres, Auth, Realtime) · Cloudflare Pages (hosting) · GitHub (source) · Cloudflare domain.

---

## Guiding architecture decisions

- **Cross-window sync = Supabase Realtime.** Manager writes state to the DB; display windows subscribe and re-render. Works across separate machines/projectors, not just tabs.
- **Timer = state, not ticks.** Store `{ status, duration_seconds, started_at, elapsed_at_pause }` in the DB. Each window computes remaining time from the wall clock locally. No drift, survives refresh.
- **One active debate at a time**, but many debates stored. An `is_active` flag (or a single-row `app_state` table) points at the current one.
- **The waiting-list ordering rules are the hard part** (rules 1, 2, 3 + position 1&2 locking). We build the list plain first, then layer rules on one at a time, each behind a toggle, with tests.

---

## Phase 0 — Foundations & "hello world" on your domain
Goal: an empty React app deployed to your real domain, wired to Supabase, before any features.

1. Initialize Git repo, push to GitHub.
2. Scaffold React + Vite + TypeScript. Add ESLint/Prettier.
3. Create the Supabase project; save keys in `.env` (and Cloudflare Pages env vars).
4. Install the Supabase JS client; make a `supabaseClient.ts`.
5. Set up routing for the three views: `/manager`, `/waiting`, `/countdown`.
6. Deploy to Cloudflare Pages; connect your Cloudflare domain. **Confirm the URL loads.**

## Phase 1 — Auth & access control
Goal: only your handful of users can reach the manager dashboard.

7. Enable Supabase Auth (email magic-link or email+password).
8. Login page; protect `/manager` behind auth.
9. Decide whether the public display windows (`/waiting`, `/countdown`) are open or token-protected.
10. Seed the allowed user accounts.

## Phase 2 — Data model (the schema everything hangs on)
Goal: tables + Row Level Security. We design this carefully once.

11. Design and create tables:
    - `speakers` (register): `id`, `name`, `gender` (man/woman/enby), `metadata`, timestamps.
    - `debates`: `id`, `name`, `is_active`, per-debate settings (first/multi speak times, color thresholds, rule toggles, display toggles, "list closed" flag).
    - `debate_participation`: links speaker↔debate, tracks `speak_count` (0 = first-time, >0 = multiple-time) so first/multi status is **per debate**.
    - `waiting_list`: `debate_id`, `speaker_id`, `entered_at`, `position`/lock state, `skipped` flag (rule 3).
    - `timer_state`: current speaker + timer fields (see architecture note).
12. Add RLS policies (authenticated users read/write; displays read-only).
13. Generate TypeScript types from the schema.

## Phase 3 — Speaker register (CRUD)
Goal: manage the pool of people, independent of any debate.

14. List/table of speakers on the dashboard.
15. Add / edit / delete a speaker (name, gender, metadata).
16. Search the register by name or id.
17. CSV/Excel **import** to bulk-add speakers.
18. **Download** the register (CSV/Excel).

## Phase 4 — Debates
Goal: create, switch, and scope everything to the active debate.

19. Create a debate; list debates.
20. Switch active debate (only one active).
21. Per-debate settings UI stub (times, thresholds, toggles) — wired to the `debates` row.

## Phase 5 — Waiting list, basic
Goal: a working queue ordered purely by entry time. No special rules yet.

22. Add a speaker to the waiting list by **name or id** (search → click to add).
23. Show the waiting list on the dashboard.
24. Remove speakers; manual move up/down.
25. First-time vs multiple-time detection via `speak_count`.
26. **Page 2 (waiting display)** — read-only render of the list, live via Realtime.

## Phase 6 — The countdown timer
Goal: the core timing loop, synced across all three windows.

27. Timer engine (state-based, computed remaining time).
28. Start / pause / reset controls on the dashboard.
29. **"Next speaker"** button — advances the current speaker, increments their `speak_count`, sets the timer duration from first/multi time. **Does not auto-start.**
30. Auto-pick duration: first-time vs multiple-time speak time (this is Special Rule 1's timing effect).
31. **Page 3 (countdown display)** — big timer, live via Realtime.
32. Yellow/red thresholds (manager-configurable seconds); color changes on pages 1 & 3.
33. Manager toggle to enable/disable the yellow/red indication on page 3.

## Phase 7 — Special rules (the hard logic, one at a time)
Goal: layer ordering rules onto the waiting list, each behind a toggle. Build a pure `computeOrder()` function with unit tests.

34. **Position 1 & 2 lock** — once a speaker reaches slot 1 or 2 they can't be overtaken (foundational; other rules respect it).
35. **Rule 1** — first-time speakers ranked before multiple-time speakers. Dashboard + page 2 visually split into two sections.
36. **Rule 2** — zebra striping: alternate so every other speaker is woman/enby where possible. Gender indicators shown on register + waiting list.
37. **Rule 1 + 2 together** — Rule 1 takes priority over Rule 2.
38. **Rule 3** — "removed" speakers can stay visible-but-skipped (with an indicator) instead of disappearing; skipped when their turn comes.
39. Manager toggles for rules 1/2/3; gender-indicator on/off toggle for page 2.

## Phase 8 — Remaining polish features
40. **"List closed" icon** — manager toggles a "no more sign-ups" icon shown on page 2 + dashboard. Cosmetic only; manager can still add.
41. **Remaining-debate-time estimate** — sum of max speak-time for remaining (non-skipped) speakers.
42. **Statistics export** — download an Excel file with stats for the current debate and across debates.
43. **Show/hide countdown on page 2** — manager toggle.

## Phase 9 — Hardening & display access
44. Realtime edge cases: refresh mid-timer, reconnect, two managers open.
45. Responsive layouts for projector/large displays (pages 2 & 3).
46. Error/empty/loading states.
47. ~~Read-only display link~~ — **DROPPED by decision (2026-07-05).** Displays stay
    login-required for privacy; the projector machine logs in once (shared account,
    session persists) rather than exposing any data via a public link.
48. Final deploy + walkthrough of a full mock debate.

---

## Phase 10 — Adjustments & additions
Grouped into batches; work top-to-bottom, one item at a time (build → user tests →
commit), same rhythm as before. Tags: [mig] = needs a SQL migration,
[asset] = needs a file from the user, [decide] = needs a decision before building.

### Batch A — Quick wins (no migration)
- **A1. Browser tab title** → change `scaffold` to `TalkTamer` in `index.html`.
- **A2. Enter-to-add** in the waiting-list "add speaker" search (Enter adds the top
  result, in addition to clicking Add). [decide: confirm "top result" is what's wanted]
- **A3. Show speaker id** in the waiting list rows.
- **A4. Register scroller** — cap the register table height with a scroll area.
- **A5. Background back to white** — light theme `--bg` cream → white (keep orange +
  black accents). Coordinated with the dark-mode toggle (D-batch) so the theme
  system is done once.
- **A6. Confirm before toggling a special rule** — a confirm step when enabling or
  disabling rule 1/2/3.
- **A7. Fix: newly-added register speakers aren't searchable in the waiting-list
  search until refresh** — share/refresh the speaker list between the register and
  the waiting-list panel (shared source or realtime), so it updates live.

### Batch B — Ordering engine changes (pure logic + tests)
- **B1. Only position 1 locked** (not 1 & 2): `LOCKED_COUNT` 2 → 1; update rows/tests.
- **B2. Zebra respects position first, then gender** [decide]: rule 2 should no longer
  always force woman/enby to the top of the rest. Proposed rule: the leader (top of
  the unlocked rest, by position) stays, and the zebra alternation *starts from that
  leader's gender* — so "man on top + woman added → man stays, woman second." Confirm
  this interpretation before I change the tested engine. Applies within each group
  when rule 1 + 2 are both on.

### Batch C — Register data model & tools
- **C1. Split name into first + last name** [mig]: `speakers.name` → `first_name` +
  `last_name`; update register CRUD, search (both fields), CSV import/export columns,
  waiting/display rendering, and the `speech_log` name snapshot.
  [decide: how to split existing single-name rows; CSV column names]
- **C2. Reset the register** [mig]: a guarded, confirmed action that clears all
  speakers and restarts the id sequence at 1 (keeps `speech_log` history via its
  snapshotted names). Cascades clear waiting lists / participation.
- **C3. Speak-count column in the register table** — show how many times each speaker
  has spoken in the *active* debate (from `debate_participation`), live.

### Batch D — Design & layout pass
- **D1. Branded header** on the manager dashboard.
- **D2. Dark-mode toggle button** — manual light/dark switch, persisted, overriding the
  OS preference. Restructures the theme to attribute-based tokens (pairs with A5).
- **D3. Two-column dashboard** — waiting list on the right.
- **D4. Settings behind a hamburger (☰) menu / drawer** to reclaim space.
- **D5. General design polish** — spacing, panels, typography (umbrella; refine as we go).

### Batch E — Displays & assets
- **E1. "Now speaking" banner on page 2** — compact, low-height.
- **E2. Custom stop icon** [asset]: replace the 🚫 emoji (list-closed) with a
  user-provided jpg/png, on page 2 and the dashboard. [needs the image file]

### Up-front needs
- [decide] A2 (Enter target), B2 (zebra semantics), C1 (name split details).
- [mig] C1 (name columns), C2 (reset RPC).
- [asset] E2 (stop-icon image — drop the file in `public/` or hand it over).

---

## Decisions (settled)
- **All three windows require login — permanently.** Every view sits behind auth. The
  read-only public link idea was dropped (2026-07-05) for privacy; the projector machine
  logs in once and the session persists.
- **Frontend uses the Supabase *publishable* key only** (`sb_publishable_...`), never the
  secret/service-role key. `VITE_`-prefixed vars ship to the browser; the secret key bypasses
  RLS, so it must never appear in client code. Any admin-only work runs server-side.
- **Speaker fields:** `name`, `gender`, `created_at` only. No extra metadata.
- **Statistics = a speech log** (`speech_log` table). One record per speech event, containing:
  the speaker's register info, how long they spoke, whether it was their first time in the
  debate, and a timestamp. A speaker who speaks more than once gets multiple records. A speaker
  removed from the waiting list still appears in the log, flagged `removed`. Export = this log to Excel.
