# TalkTamer — Session Handoff

Read this first. It captures everything a fresh session needs to keep building
TalkTamer. Companion docs: **[PLAN.md](PLAN.md)** (the phased roadmap, with
settled decisions) and **[description.txt](description.txt)** (the user's
original spec — do not edit it).

_Last updated: 2026-07-05, after Phase 9. Phase 10 planned (see PLAN.md)._

---

## What this is
A debate-management web app with **three login-gated browser windows**:
1. **Manager dashboard** (`/manager`) — the chairman controls everything here.
2. **Waiting-list display** (`/waiting`, page 2) — read-only public screen.
3. **Countdown display** (`/countdown`, page 3) — read-only public timer.

## Stack & infra
- **React 19 + Vite + TypeScript**, React Router v7. Plain inline styles + a small
  design-token stylesheet ([src/index.css](src/index.css)); no UI framework.
- **Supabase** — Postgres, Auth (email+password), Realtime. Client:
  [src/lib/supabaseClient.ts](src/lib/supabaseClient.ts).
- **Cloudflare Pages** hosting, auto-deploys from GitHub `main` (~1 min builds).
- **GitHub**: `https://github.com/Kolupso/talktamer` (remote `origin`, branch `main`).
- **xlsx (SheetJS)** for CSV/Excel — installed from the **CDN tarball** (patched
  0.20.3), dynamically imported so it's a separate chunk.
- **vitest** for unit tests (`npm test`).

## Environment (the user's machine)
- Windows 10, **PowerShell** primary shell; a Bash tool is also available (POSIX).
- Node 24, npm 11, git 2.51.
- Project root: `c:\Users\ida94\OneDrive\Projects\TalkTamer`.
- `.env` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  (**publishable** key `sb_publishable_...`). `.env` is gitignored.
  Supabase project ref: `rcndcqizwoxbaywezgqg`.

---

## Current status: Phases 0–9 DONE. Next: Phase 10 (batched, planned in PLAN.md).
All committed and pushed. `git log` matches the phase commits below.
The core app is functionally complete; a full mock-debate run-through found no bugs.

- **Phase 0** ✅ scaffold, routing, deploy pipeline live on Cloudflare.
- **Phase 1** ✅ email/password auth; all routes behind `ProtectedRoute`.
- **Phase 2** ✅ schema (6 tables) + RLS + realtime.
- **Phase 3** ✅ speaker register: CRUD, search, CSV/Excel import + download.
- **Phase 4** ✅ debates: create/switch (atomic), per-debate settings panel.
- **Phase 5** ✅ waiting list: add by name/id, remove, live page-2 sync.
- **Phase 6** ✅ countdown timer: server-side RPCs, next-speaker logic, page 3,
  yellow/red thresholds, speech logging.
- **Phase 7** ✅ special rules: position 1&2 lock + rule1/2/3 via a **pure,
  unit-tested** ordering engine ([src/lib/ordering.ts](src/lib/ordering.ts),
  tests in `ordering.test.ts`, 7 passing).

### Phase 8 ✅ (done)
- **Remaining-debate-time estimate** — shown in the waiting-list panel heading
  (`WaitingListManager`), sum of allotted time over non-skipped waiting speakers.
- **Statistics export (Excel)** — `StatisticsPanel` + [src/data/stats.ts](src/data/stats.ts);
  exports `speech_log` joined to `debates` (includes **Debate name** column per
  user request). Two buttons: current debate / all debates.
- **List-closed icon** 🚫 — done in Phase 7.
- **Page-2 countdown** — `Waiting.tsx` renders `WaitingCountdown` (via `useTimer`)
  when `show_countdown_on_waiting` is on.

### Phase 9 ✅ (done)
- **Brand palette** applied ([src/index.css](src/index.css)): orange `#EF4123`,
  cream/white `#FBF5D0`, black `#000`, light + dark. (Note: Phase 10 A5 changes the
  light background from cream back to white.)
- **Projector-friendly displays** — pages 2 & 3 use `clamp()`/`vw` responsive type.
- **Read-only display link DROPPED** (user decision 2026-07-05): all three windows
  stay login-required for privacy; the projector machine logs in once (shared
  account, session persists). No public-read policies were added.

### Phase 10 (do next) — adjustments & additions
The user gave a 19-item list, captured in **[PLAN.md](PLAN.md) → Phase 10**, grouped
into batches A–E (work top-to-bottom, one item at a time, build→test→commit):
- **A — quick wins:** tab title→TalkTamer, Enter-to-add (adds TOP result — decided),
  show speaker id in waiting list, register scroller, light bg cream→white, confirm
  before toggling a special rule, fix newly-added register speakers not appearing in
  the waiting-list search until refresh.
- **B — ordering engine (update `ordering.ts` + tests):** only position 1 locked
  (`LOCKED_COUNT` 2→1); zebra should respect position first then gender — proposed:
  leader of the rest stays and alternation starts from their gender (CONFIRM with user
  before changing the tested engine).
- **C — register model:** [mig] split `name`→`first_name`+`last_name` (touches CRUD,
  search, CSV import/export, displays, `speech_log` snapshot); [mig] reset-register
  action (clear speakers + restart id sequence, keep `speech_log`); speak-count column
  in the register table (from `debate_participation`, for the active debate).
- **D — design/layout:** branded header; dark-mode toggle button (persisted,
  attribute-based theme — pairs with A5); two-column dashboard (waiting list right);
  settings behind a ☰ menu/drawer; general polish.
- **E — displays/assets:** compact "now speaking" banner on page 2; [asset] custom
  jpg/png stop icon to replace the 🚫 (user to supply the file, e.g. in `public/`).

Up-front needs before their batches: decisions on B (zebra) and C1 (name split
details + CSV columns); the stop-icon image for E2.

---

## How to work with this user (important)
- **Phased & collaborative.** Build one phase at a time, explain the design and
  key decisions before/while building, then hand back for testing. Do not
  fast-forward multiple phases without check-ins.
- **The user runs SQL migrations themselves** in the Supabase SQL Editor (no
  Supabase CLI). Write each migration as a numbered file in
  `supabase/migrations/`, push it, and give copy-paste run instructions.
  - Supabase shows a **"destructive operations" warning** for any migration whose
    function bodies contain `update`/`delete`/`drop`. It's a **false alarm** (the
    SQL only *defines* functions). Reassure and proceed.
- **The user tests manually**, often across two browser windows to verify
  Realtime sync. Give explicit test steps each phase.
- **Verify against a FRESH build.** A stale build once masked a correct timer fix.
  When a fix "doesn't work," suspect a stale build/cache first (hard-refresh,
  restart dev server, or confirm the Cloudflare deploy finished).

## Conventions & commands
- **Commit after each phase** (and after each meaningful fix). Push to `main`.
- **Commit messages: NO `Co-Authored-By` / credit trailer** — the user rejected
  it. Plain messages only. (Also recorded in Claude memory.)
- Commits so far were made with an explicit identity to avoid prompts:
  `git -c user.name="Ida Christensen" -c user.email="ida.94.christensen@gmail.com" commit ...`
- **Never put the Supabase secret key in the frontend.** `VITE_`-prefixed vars
  ship to the browser; only the **publishable** key belongs here. Admin work (if
  ever needed) runs server-side.
- Before committing: `npm run build` (tsc + vite) must pass; `npm test` for logic.
- Line-ending LF→CRLF warnings from git on Windows are harmless.

---

## Database schema (5 migrations, all already run in Supabase)
Files in `supabase/migrations/`. TS mirror: [src/types/db.ts](src/types/db.ts).

- **0001** — enums (`gender` = man/woman/enby, `timer_status`), tables:
  `speakers`, `debates` (settings inlined, partial unique index enforces one
  active debate), `debate_participation` (`speak_count`), `waiting_list`,
  `timer_state` (one row per debate), `speech_log`. RLS = full access for
  `authenticated`. Realtime publication added for the display-facing tables.
- **0002** — trigger auto-creating a `timer_state` row per new debate;
  `set_active_debate(target)` atomic switch RPC.
- **0003** — `REPLICA IDENTITY FULL` on filtered tables so Realtime **DELETE**
  events carry the filter column (`debate_id`); without it, live deletes on
  page 2 silently didn't fire.
- **0004** — timer RPCs: `timer_start/pause/reset` (use server `now()` for
  drift-free banking) and `advance_speaker` (finalise current speaker → log to
  `speech_log` + bump `speak_count`, then load next from queue; does NOT
  auto-start).
- **0005** — `position` column on `waiting_list` (persisted display order;
  positions 1&2 are the locked slots); `reorder_waiting(debate_id, ids[])` RPC;
  `advance_speaker` updated to pick by `position` and renumber.
- **0006** — rule-3 rework: replaced the full `unique(debate_id, speaker_id)`
  with a **partial unique index** (`where not skipped`) so a speaker can be
  re-added while an old skipped row remains (≤1 active row, many skipped rows);
  `advance_speaker` now drops+logs (`removed=true`) any skipped speakers ahead of
  the chosen next speaker.

## Architecture notes / gotchas
- **Timer = state, not ticks.** `timer_state` stores `status`,
  `duration_seconds`, `started_at`, `accumulated_seconds`. Each window computes
  remaining locally: `duration - accumulated - max(0, now - started_at)`.
  Display uses **`Math.ceil`** so "shows 5" and "≤5 → yellow" align; elapsed is
  **clamped ≥ 0** to prevent a "+1s" flash from clock skew. See
  [src/data/timer.ts](src/data/timer.ts), [src/hooks/useTimer.ts](src/hooks/useTimer.ts).
- **Ordering engine** ([src/lib/ordering.ts](src/lib/ordering.ts)): pure
  `computeOrder(entries, {rule1, rule2})`. Top 2 positions are locked/exempt;
  rule1 = first-timers before multi; rule2 = zebra (alternate woman/enby ↔ man,
  starting woman/enby); rule1+rule2 → rule1 wins, zebra within each group. It's
  **idempotent** (feeding its output back is stable → reconcile loop converges).
- **Who persists order:** the **manager** window computes the order and writes it
  via `reorder_waiting` ([src/hooks/useOrderedWaiting.ts](src/hooks/useOrderedWaiting.ts)
  with `reconcile=true`). Displays compute the same order locally for rendering
  but do NOT write. So the manager window should stay open during a debate.
- **Manual ↑/↓** reorder buttons are hidden when rule1 or rule2 is on (order is
  rule-driven then).
- **Realtime pattern:** subscriptions just trigger a re-fetch (see the hooks);
  we don't diff payloads.

## Key files map
- Auth: [src/auth/AuthProvider.tsx](src/auth/AuthProvider.tsx),
  [src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx),
  [src/pages/Login.tsx](src/pages/Login.tsx).
- Debate context: [src/debate/ActiveDebateProvider.tsx](src/debate/ActiveDebateProvider.tsx).
- Data layers: [src/data/speakers.ts](src/data/speakers.ts),
  [src/data/debates.ts](src/data/debates.ts),
  [src/data/waitingList.ts](src/data/waitingList.ts),
  [src/data/timer.ts](src/data/timer.ts).
- Hooks: [src/hooks/useWaitingList.ts](src/hooks/useWaitingList.ts),
  [src/hooks/useOrderedWaiting.ts](src/hooks/useOrderedWaiting.ts),
  [src/hooks/useTimer.ts](src/hooks/useTimer.ts).
- Manager UI: [src/pages/Manager.tsx](src/pages/Manager.tsx) composes
  `DebateBar`, `TimerController`, `WaitingListManager`, `DebateSettings`,
  `SpeakerRegister` (all in `src/components/`).
- Displays: [src/pages/Waiting.tsx](src/pages/Waiting.tsx),
  [src/pages/Countdown.tsx](src/pages/Countdown.tsx). Shared row renderer:
  `WaitingRows`, `GenderBadge`.

## Settled decisions (also in PLAN.md)
- All three windows require login for now (read-only link = Phase 9).
- Speaker fields: `name`, `gender`, `created_at` only (no extra metadata).
- Statistics export = the speech log described in Phase 8 above.
