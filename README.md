# REBOUND — Private PWA (rebound-app)

Private personal discipline OS. Dark-first, Jet Black / White / Neon Lime
(#D7E317) / Dark Gray, Poppins. React 18 + TypeScript (strict) + Vite,
plain CSS (no Tailwind, no heavy dependencies beyond @supabase/supabase-js).
No mock or sample data anywhere — empty states are shown when no rows exist.

## What was built

- **Auth (guarded):** email/password sign-up + sign-in, sign-out, password
  reset email. Without a session, only the auth screen is shown.
- **Command Center:** date in Asia/Karachi, today's prayer checklist
  (upsert into `prayer_logs`), today's focus total (completed sessions only,
  overlapping sessions flagged), last sleep session, today's habits, and a
  provisional discipline score.
- **Provisional score formula (documented in `src/lib/score.ts`):**
  completed categories ÷ applicable categories. Categories: Prayer (all 5),
  Sleep (wake time logged), Focus (minutes ≥ daily target, default 240 from
  `profiles`), Workout (status completed), Habits (all active habits done;
  excluded from the denominator when no active habit definitions exist),
  Grooming (morning + evening), Reading (any session), Journal (any entry).
  The score becomes final only via Finish Day.
- **Pages with real CRUD against the Rebound Supabase tables:**
  Prayer + Qaza ledger (add outstanding, mark fulfilled, `qaza_ledger_history`
  audit row per change, outstanding total), Sleep (HH:MM bedtime, nullable
  wake time; duration computed ONLY when wake time exists, across midnight),
  Reading (sessions + per-book bookmarks + learning notes), Workout
  (sessions + exercises), Focus (timer start/stop + manual entry, client-side
  overlap warning, default target 240), Habits + Grooming (definitions +
  daily logs, morning/evening slots), Nutrition (junk/outside/other;
  configurable junk definition stored in `user_preferences`), Self-control
  (porn_exposure / masturbation, strictly private, neutral non-shaming
  language, no public anything), Journal, Life events / time audit,
  Finance (accounts + transactions, PKR default; balance DERIVED as
  opening_balance + signed transactions — there is no editable balance
  field; spending_class includes impulse/regretted), Global search
  (journal + learning notes + book titles/bookmarks), Finish Day (writes
  `daily_summaries` with `score_status='final'`), Visibility Control Center
  (per-category toggles saved to `public_visibility_settings`; copy states
  OFF removes the category from the public site at the data layer).
- **PWA:** `public/manifest.webmanifest`, service worker
  (`public/sw.js`, cache-first for the app shell only — Supabase traffic is
  never cached), icon copied from the original brand mark
  (`public/icon.svg`, from `~/workspace/rebound/brand/rebound-logo.svg`).
  Service worker registers in production builds only.
- **Offline behaviour (intentional, not faked):** online-only. An offline
  banner warns that changes cannot be saved until back online, and unsaved
  form input should not be relied on across a tab close. There is NO
  IndexedDB outbox or background sync in this build — see below.

## Environment variables (names only — never commit values)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (fallback: `VITE_SUPABASE_ANON_KEY`)

The app reads these via `import.meta.env` only. No key or URL is hardcoded
or printed anywhere in the code. If they are missing, the app shows a
configuration screen instead of crashing.

## Build

```bash
cd ~/workspace/rebound/apps/app
npm install
npm run build
```

Verified 2026-10-26: `npm install` added 77 packages; `npm run build`
(`tsc --noEmit && vite build`) passed with no TypeScript errors —
91 modules transformed, built in ~6s, output in `dist/`.

## Intentionally NOT done yet

- IndexedDB offline outbox / background sync (documented above as
  online-only instead of faked).
- A PNG PWA icon: no SVG→PNG converter was available in this environment,
  so the manifest references the original SVG mark (`icon.svg`) only.
  Generate a 512×512 PNG from `brand/rebound-logo.svg` later and add it to
  the manifest if a store/install prompt requires a raster icon.
- Public-dashboard enforcement itself (that lives in `apps/public` and in
  the database views — this private app only writes the visibility toggles
  and states the data-layer rule in its copy).
- Automated tests: the build's TypeScript check (`tsc --noEmit`) is the
  verification step for this build; no test runner was added.
- Deployment / GitHub push: explicitly out of scope for this build.
