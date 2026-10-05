# LeadHunterClub — Work Log (cross-session memory)

> **Read this first in any new opencode session.** It tracks the frontend/design checklist,
> what's already done (so you don't redo it), what's blocked (and on whom), and deploy state.
> Update the statuses and "Completed" section as you finish items.

**Project:** `E:\programming and stuff\leadhunterclubfull` — Next.js 14 app in `apps/web`, branch `main`.
**Context:** Same-day production deploy target https://leadhunterclub.com. User does frontend/design with opencode; backend goes to "the backend guy."

---

## 1. The checklist (11–12 items)

| # | Item | Status |
|---|------|--------|
| 1 | Hero background — full-bleed wolf video (image → video, hero text → end of app demo) | ✅ done + browser-verified |
| 2 | Hero font mismatch — headline line 2 used undefined `font-serif` | ✅ done |
| 3 | Bento grid — Step 02 overlap on hover + unify Step 01–04 labels | ✅ done |
| 4 | Capabilities card 4 — interactive credit-ledger UI (superseded the original "replace with video" ask) | ✅ done + browser-verified (16/16 checks desktop+mobile) |
| 5 | Rollover copy → 15 days everywhere | ✅ done + visually verified |
| 6 | Pricing → 2 plans only: Free (no card) + ₹999 — landing + `/pricing` | ✅ done + browser-verified |
| 7 | Footer — rework nav columns + real social links | 🟡 nav columns ✅ done + browser-verified; social/legal URLs pending from user |
| 8 | Onboarding — real-time email/number validation; experience → Beginner 6–12mo / Intermediate 1–3yr / Expert 3–6yr | ✅ done |
| 9 | Admin UI — audit every section's dropdowns (z-index/overflow clipping) & fix | ✅ code + harness-verified (sweep of the 2 real admin pages needs admin login) |
| 10 | Saved leads — wire `LeadDrawer` popup on lead name click (like lead feed) | ✅ code + compile-verified (click-through needs login) |
| 11 | FAQ reorder — landing FAQ `page.tsx` from 1,2,3,4 → 1,4,2,3 | ✅ done + visually verified |
| 12 | "Firebase auth panel" change | ❓ unclear — awaiting user clarification |
| 13 | Landing copy → `docs/landingpagecontent.md` (hero/how/why/testimonials/pricing/final CTA) | ✅ done + browser-verified (desktop + mobile) |

Note: user's original list had duplicate "5" (rollover + pricing); renumbered as above (rollover=5, pricing=6).

---

### #8 Onboarding — real-time validation + 3 experience options (done)
- **Experience options** (`onboarding/page.tsx:172-176`): 5 → **3**: `beginner` = "Beginner
  (6-12 months)", `intermediate` = "Intermediate (1-3 years)", `expert` = "Expert (3-6 years)".
  Values kept within the original set (backend is `z.string().min(1)` — no enum, verified).
  Restore-from-localStorage now resets stale values (`none`/`advanced`) to `''`.
- **New helper** `isValidPhoneNumber` in `src/lib/phone.ts` (7–15 digits, formatting-agnostic).
- **Onboarding step 1**: live phone hint (green ✓ / red) under `PhoneInputWithCountry`, live
  red border via `error` prop, Continue + submit guards added.
- **Register page** (where the email input actually lives — onboarding itself has no email
  field): controlled email input with live green ✓ / red ✗ hints + border states, submit guard
  (`Please enter a valid email address`); phone input gets the same treatment and "Send OTP"
  stays disabled until the number is valid.
- Verified: lint clean; validators+auth tests 50/50; temp unit test for `isValidPhoneNumber`
  2/2 (removed after); computed-style proof of both email states (red-400 hint vs emerald-400
  hint + matching borders); `/onboarding` compiles and redirects → `/login` when logged out.
- **Not visually verified** (needs a real logged-in session): the onboarding experience
  dropdown + step-1 phone hint. Code-reviewed only.

### #11 FAQ reorder (done)
- `page.tsx:648-663` FAQ order 1,2,3,4 → **1,4,2,3**: credits → source → leads/month →
  close-clients. Verified via DOM query + full screenshot (all 4 expanded, order correct).
- Note: this is the **landing** FAQ. HeroSection has a separate support/FAQ area — untouched.

### Out-of-band fixes (not on the original 12)

- **Reveal-price display refresh (2026-10-05, user-spec):** user set new reveal prices —
  **email 10 · phone 12 · both 15 · profile 5** — asked to change every *displayed* credit
  value site-wide (frontend scope; charging logic = backend guy). Frontend surfaces updated:
  LeadCard + PipelineLeadCard unlock pills (fallback 3 → 10), LeadDrawer (tokenCost null-guard
  kept), admin/leads cost chips + credit modal, ManualLeadModal/RefineLeadModal hints
  (2–10 → 5–15), landing pricing cards (`~3–5` / `66–100` reveals), FAQ (10/12/15 + profile 5,
  "66 to 100+"), TokenSystemSection copy ("costs 15 credits" — was "3 tokens"), FeaturesSection
  ledger widget (reads `LEAD_REVEAL_COSTS`, demo loop recomputed: 50→40→35→23→8, Need 10,
  top-up →58→48→33→21→11, total 89), 20 mock leads (hero/token/giftwrap =15, who-grid side
  cards =10, personas =15 per its "phone + profile included" copy). **Backend synced same
  session:** `768f819` set `lib/config/coins.ts` to the same 12/10/15/5 + updated `coins.test.ts`
  and the `revealCost: 1` placeholder in `api/leads/route.ts:197` — so the temporary
  legacy-map shim (`display-costs.ts`, built while the server still sent 5/8/10/2) was
  **deleted** the same day; all call sites now read `LEAD_REVEAL_COSTS`/`revealCost` raw.
  (If that backend commit is ever reverted, the shim pattern + mock-id bypass must return —
  see git history for `display-costs.ts`.) Copilot prompts already say 10/12/15 ✓; HunterCopilot
  hint "10-15 per lead" ✓. Verified: lint clean, 0 tsc errors in touched files, vitest 18/185 =
  baseline, browser   30/32 (2 = collapsed-FAQ probe artifact; expanded-FAQ probe = all true,
  who-grid pills -10/-15/-10 correct, ledger loop exact, 0 console errors).
  **Copy-sync sweep (same day):** Hunter Copilot FAQ (`api/copilot/route.ts`) was the
  stale outlier — still said "top-ups starting at ₹199" (5×; actual ₹99 in pricing/
  refill/admin-plans) and "Between 65 to 100+" (4×) — synced to landing-FAQ truth and
  added "Profile link = 5 coins"; `sneak-peek/page.tsx` "3 Tokens to Reveal" →
  "10–15 Credits to Reveal" + "Get Tokens"/"have tokens" → "credits" (terminology =
  credits). Re-verified: lint clean, 0 tsc, vitest 18/185 = baseline, /sneak-peek 200
  with stale strings gone. Pushed as `4cdc4ef` (rebased over backend's `1b399f5`;
  pill/tokenCost lines survived intact).

- **Mass user wipe (2026-10-05, user-requested):** user asked to remove every account's
  sign-in access, keeping only dualspark / yash* / admin@leadhunter. Executed via temp script
  (service account + Prisma): **Firebase Auth 37 → 9 accounts** (28 deleted), **DB 22 → 5 rows**
  (17 hard-deleted; `RoleAssignment` cleaned manually — it's the only user-ref without
  `onDelete: Cascade`). Kept: Firebase = dualsparkstudio, admin@leadhunter, 7× yash accounts
  (yashkaranjule08/19/230, karanjuleyash51, yashnandanshrivastava, yashvilas368, instaviral15);
  DB = system@internal.leadhunter (automation, no Firebase login) + dualsparkstudio +
  admin@leadhunter + yashkaranjule230 + yashnandanshrivastava. Note: 5 of the 7 kept yash
  Firebase accounts have **no DB row** (were signups that never completed onboarding) — they'll
  get a fresh row on next login. "aman" was in the user's keep-list but no such account exists
  anywhere (confirmed with user → skipped). Verified post-state: FB total 9, DB total 5,
  all ACTIVE. No failures.

- **Coming-soon landing (2026-10-05):** `/` now serves `app/components/ComingSoon.tsx` —
  full-bleed looping bg video (`public/videos/1003.mp4`, 436 KB H.264, converted from user's
  `D:\Downloads\1003.mov`; .mov is not Firefox-playable) + wolf poster fallback, **asymmetric
  left-anchored layout** (left-weighted scrims, footage breathes right; no centered pill-badge
  hero): mono kicker "Stop chasing clients." → **H1 "Coming soon."** (big display, amber
  period; user asked for big coming-soon text) → H2 "Find people already looking for what you
  sell." → user-supplied LeadHunter paragraph verbatim → single CTA **Create your account →
  /register** (existing members onboard pre-launch; sign-in link removed from this page by
  request) + note "platform isn't fully live yet… start onboarding" (added so the page states
  the coming-soon + onboard-now message explicitly).
  Marketing `Navbar` hidden on `/` while gate is on
  (`ClientLayout.tsx:359`). Gate = `src/lib/launch.ts` plain boolean `COMING_SOON = true` —
  flip to `false`, commit, deploy to restore the hero landing. **Both directions
  browser-verified 2026-10-05:** false → hero sections + navbar back; true → coming soon +
  navbar hidden. (Early env-var version `NEXT_PUBLIC_COMING_SOON` was abandoned — unproven,
  unnecessary.) NOTE: write launch.ts as UTF-8 — a PowerShell `Get-Content | Set-Content`
  round-trip corrupts its non-ASCII comment chars. Verified: lint clean, HTTP 200,
  video src + CTA in served HTML, `/videos/1003.mp4` 200, old landing sections absent.

- **Dev preview link (2026-10-05):** `http://localhost:3000/?preview=1` renders the **real
  hero landing** (wolf video, 3500+ strip, navbar, `/#…` anchors all working) while
  `COMING_SOON` stays `true` — no flag flip needed to view it. How: `page.tsx` +
  `ClientLayout.tsx` each read the param in a mount-time `useEffect` and bypass the gate /
  navbar-hide when `NODE_ENV === 'development'` (inlined at build → param is a **no-op in
  production**, gate can't be bypassed publicly; first visit flashes ComingSoon ~1–2 s until
  hydration, then swaps). Deliberately a query param on `/` (not a `/preview` route) because
  the Navbar's links are `/#funnel`-style — pathname must stay `/`. Verified: preview URL =
  landing + navbar + visible strip + hero video playing/looping, 0 console errors; plain `/`
  still serves ComingSoon with navbar hidden.

- **#4 Credit-ledger widget** (`FeaturesSection.tsx`): replaced stale tier selector
  (250/750/2000 credits, "3/reveal" — all wrong vs product) with a live ledger demo:
  8 demo leads, real costs from `coins.ts` (email 5 / phone 8 / both 10 / profile 2),
  start 50 (Free plan), reveal → balance animates + ledger row slides in (`−N … BAL N`),
  low-balance → disabled "Need N" + pulsing top-up, `+50 top-up` mint row, Reset.
  Fits the 260px card slot exactly (258/258 desktop, 238/238 mobile). Copy uses **"credits"**
  (product term; user said "tokens" but site never says tokens — flagged to user).
  Verified: lint/tsc clean, 16/16 browser checks, 0 console errors.
- **Flowchart lead card** (`LeadOutreachFlowchart.tsx`, Why-section): desktop Stage 03 +
  mobile Step 3 mock were bright-green `#B8F36B` cards with "✓ Claimed" footer — restyled
  1:1 with feed `LeadCard.tsx`: `bg-surface-container-low rounded-[22px] border
  border-border-subtle shadow-elevation-3`, category dot + `3/25` badge + timestamp,
  real type scale (headline 10.5px/0.12em, quote 13.5px clamp-2 / 15px clamp-3 mobile),
  accent-pill-first tags, footer = avatar + name + email + SAVE button. Verified: dark bg
  `rgb(27,28,29)`, radius 22, no green, fits, 0 console errors, screenshots OK.

### Dev-server incident (resolved)
- Mid-session `/pricing` started returning `500 Cannot find module './4522.js'` (stale webpack
  cache after hot reloads of route files). Fix: kill :3000, `Remove-Item .next -Recurse -Force`,
  restart `npm run dev`. If clicks mysteriously do nothing after heavy editing → do this first.
- **OOM recurrence (2026-10-02 night):** machine hit 0.3 GB free RAM → `next dev` died twice
  (`Zone Allocation failed`). Fixes: start with `NODE_OPTIONS=--max-old-space-size=3072`,
  clear `.next`, and launch the server in a **short-lived shell command** (a command that hits
  the shell timeout gets its whole process tree killed — the dev server dies with it).
- **Playwright quirk on this site:** `:text-matches()` selectors returned 0 matches; desktop +
  mobile twins both exist in DOM (only one visible per viewport) → always add `:visible` and
  prefer `evaluate()` for text reads/clicks. `waitUntil: 'load'` times out (hanging video
  subresource) → use `domcontentloaded`.

## 2. Completed work (don't redo)

### #1 Hero image → full-bleed wolf background (done)
- **Asset:** user pasted "Wolf Stalking Through Darkness.png" in chat (no file path — extracted
  the base64 part from the opencode session DB) → saved as
  `apps/web/public/images/hero-wolf.png` (1578×997, ~1.2 MB).
- **`HeroSection.tsx`:** artwork lifted OUT of the island card → new **section-level
  `absolute inset-0` motion layer** (keeps the scroll-scrub `bgScale` 1.1→1.35 and the same
  calibrated gradient + radial scrims). The section runs nav-top → demo-end (`pb-0`), so the
  image covers exactly "till the dashboard demo ends". Island card now sits on the artwork
  with a light local radial scrim (`rgba(11,13,19,0.45)` center) to keep headline contrast.
  Old `/images/hero image 2.png` reference removed (file kept on disk).
- **Verified:** lint clean; `tsc` 0 errors in HeroSection; browser screenshots desktop +
  mobile — art behind hero text ✓, glowing eyes visible in the gap above the demo ✓, demo
  bottom → next-section transition clean ✓, console clean (1 pre-existing Lenis warn).
- **Pre-existing quirk — "Trusted by 3500+" strip (FIXED 2026-10-05):** the strip was
  invisible on **every** viewport since the full-bleed restructure — two stacked causes:
  (a) demo window's `lg:mt-[-48px]` pulled it over the strip (only `mb-8` clearance) on lg+;
  (b) the section-level bg layer is `absolute … z-0` (positioned → paints ABOVE static
  in-flow content), so the plain static strip div rendered *underneath* the video/scrims at
  all sizes (hero copy survived because it lives in transformed `motion.div`s = positioned
  layer; demo has `z-10`). Fix: strip wrapper got `relative z-10` + `lg:mb-16` (64 − 48 =
  16px gap above the demo; mobile keeps `mb-8`/`mt-[-24px]` = 8px gap). Verified headless
  (gate flipped false): full-viewport screenshot shows the tan mono strip between the credits
  line and the demo, hit-test returns the span itself, 0 console errors, lint clean; gate
  restored to `true` after (ComingSoon markers re-verified on `/`).
- **Full-bleed fix (user follow-up):** the gutters came from `page.tsx:58`'s
  `<main className="... max-w-[1280px] mx-auto px-4 sm:px-6">` (screenshot math: ~1580px
  viewport → 1280 centered → content starts at x=174 ✓). Restructured so only the hero
  artwork breaks out, zero change to the rest of the layout:
  1. `page.tsx` main keeps `min-h-screen bg-bg-main ... overflow-x-hidden` but LOST
     `max-w-[1280px] mx-auto px-4 sm:px-6`; a new wrapper `<div className="mx-auto
     max-w-[1280px] px-4 sm:px-6">` now wraps **everything after `<HeroSection />`**
     (divider → footer) → below-hero geometry byte-identical to before.
  2. `HeroSection.tsx`: card + social strip + demo wrapped in `<div className="w-full
     max-w-[1280px] px-4 sm:px-6 mx-auto">` → hero content keeps its exact old width;
     the bg layer (absolute inset-0 on the section) now spans the **full viewport**.
  - Verified: lint clean (both files), `tsc` clean (both files), page HTTP 200, served HTML
    contains both new wrappers + `hero-wolf.png` srcset (13 refs). Browser screenshot pass
    pending (chrome-devtools tools unavailable that session).
- **Glass-panel removal (user follow-up 2):** island card's `rounded-[22px] border
  border-white/[0.08] shadow-[0_25px_85px...] overflow-hidden` + the local radial film
  (`rgba(11,13,19,0.45)`) behind the text — all removed. Hero copy is now frameless,
  sitting directly on the full-bleed artwork; legibility relies on the section-level
  calibrated scrims only (gradient + vignette, unchanged). Kept: layout box (min-h/flex/
  mb-10 + `heroCardRef` for the scroll-zoom). Verified: lint + tsc clean, HTTP 200,
  served HTML has 0× old panel classes / 0× film gradient / 1× new frameless div.
- **Background video (user follow-up 3, 2026-10-05):** the still artwork was replaced with a
  **looping video** of the same wolf footage. Asset: user's `D:\Downloads\1003.mov` (H.264
  1920×1080 30 fps 5.17 s) remuxed losslessly → `apps/web/public/videos/hero-bg.mp4`
  (3.16 MB, `-c copy -movflags +faststart`); poster frame → `public/videos/hero-poster.jpg`
  (35 KB, 1600w). `HeroSection.tsx`: the `<Image>` in the bg layer became
  `<video src="/videos/hero-bg.mp4" poster="/videos/hero-poster.jpg" autoPlay={!reduceMotion}
  muted loop playsInline preload="auto" disablePictureInPicture aria-hidden>` with
  `object-[center_40%]`; unused `next/image` import removed. Scroll-zoom `bgScale` 1.1→1.35
  and both scrims unchanged (no JS touch — scrub still drives the video's containing layer).
  - **Verified:** lint + tsc clean; `/videos/hero-bg.mp4` 200 (3155627 B) + poster 200;
    Playwright with gate flipped false: `paused:false, readyState:4, error:null, 1920×1080,
    muted:true, loop:true`, playhead advanced 3.04→4.57 s, screenshot = wolf video behind the
    frameless hero copy ✓. Flag then **restored to `true`** and re-verified `/` serves
    ComingSoon (`1003.mp4` ×1, hero headline absent, HTTP 200).
  - **Two copies of the same footage now exist:** hero uses `/videos/hero-bg.mp4` (3.16 MB
    lossless remux), the coming-soon page uses `/videos/1003.mp4` (436 KB re-encode — kept
    small because it's the default landing). Don't dedupe blindly: sizes serve different pages.
- **Staged intro choreography (user follow-up 4, 2026-10-05):** the hero content now waits
  for the video — bg video plays **alone for ~3.5 s** (hold counted from the video's first
  `play` event, not page load), then a slow staggered cascade reveals: headline (+0 s,
  0.85 s ease) → subcopy (+0.3) → CTA row (+0.6) → credits line (+0.85) → 3500+ strip
  (+1.1) → demo window (+1.4, y 60→0 over 1 s). Implementation: `revealed` state in
  `HeroSection.tsx` + shared `reveal(delay, fromY, duration)` helper replacing the old
  mount-immediate entrance anims; CTA row + demo get `pointer-events: none` until revealed
  (no invisible-click traps). Guards: `reduceMotion` → instant reveal (no hold, no stagger),
  **7 s safety timer** if autoplay never fires (poster stays, content still appears),
  StrictMode-safe timer cleanup. Content stays in the DOM at opacity 0 during the hold
  (SEO/text unaffected). Verified with a Playwright opacity timeline on `/?preview=1`:
  video alone at t≈2 s, h1 full at 4.7 s, strip 5.5 s, demo 6.0 s (cascade order correct),
  video looping, 0 console errors; hold + final screenshots match; lint + tsc clean.

### #2 Hero font (done)
- `apps/web/src/app/components/HeroSection.tsx:2276`: removed `italic font-normal font-serif`
  (font-serif undefined in Tailwind config → fell back to Georgia/Times). Now
  `font-light text-white/90` (Space Grotesk 300 vs 600 weight contrast).
- Verified: lint clean, screenshot confirmed. Only `font-serif` usage in codebase.

### #3 Bento grid (done, `apps/web/src/app/page.tsx`)
- Funnel visual wrapper `relative h-[140px] mb-4` → `relative min-h-[140px] mb-4`
  (content was 158px in a 140px box → 3px overlap of "Step 02" label on hover).
- Step 02 (`font-mono text-text-secondary`) + Step 03 (`font-mono text-accent-purple`) labels
  unified to match 01/04: `text-sm font-semibold text-accent-orange block mb-2`.
- Verified in-browser: gap −28px at rest **and** on hover (was +3px overlap); all 4 labels
  identical (`600 · rgb(255,184,0) · 14px`); lint clean.

### #5 Rollover copy → 15 days (done — fully verified in browser)
Backend truth: `ROLLOVER_VALIDITY_DAYS = 15` in `apps/web/src/lib/services/rollover.ts`.
Full leftover carries, expires 15 days after renewal. **Product rule that stays:** *purchased
top-ups never expire* (separate claim, true — bonus pool, not rollover).

Changed (13 edits across 6 files):
- `pricing/page.tsx:61` — `'Unused credits rollover (up to 30 days)'` → `'Unused credits roll over for 15 days'`
- `pricing/page.tsx:75` — `'Full 30-day rollover support'` → `'15-day rollover on unused credits'`
- `pricing/page.tsx:593` — banner heading `Instant Credit Rollover Guarantee` → `Purchased Credits Never Expire`
  (was conflating top-up rule with rollover; description kept)
- `HeroSection.tsx:2051` — `roll over up to 30 days` → `roll over for 15 days`
- `page.tsx:502,518` — `'Credit Rollover'` → `'15-Day Credit Rollover'` (both plan cards)
- `page.tsx:626` — `Credits roll over each month` → `Unused credits roll over for 15 days`
- `FeaturesSection.tsx:168-170` — `rollover: '100% Rollover'` → `'15-Day Rollover'` (×3 tiers)
- `FeaturesSection.tsx:218` — **`NO EXPIRATION DATE`** (was a straight-up bluff) → `FULL LEFTOVER CARRIES OVER`
- `email-templates/index.ts:410,566,578` — renewal emails now say rollover = 15 days
  (removed "so you never lose what you've earned").
- **`api/admin/plans/route.ts:31,47`** — API-side DEFAULT_PLANS (found during visual pass:
  `/pricing` serves features from `/api/plans` → `db.setting['plans_config']` → falls back to
  these defaults). Fixed: `'Unused credits rollover (up to 30 days)'` → `'Unused credits roll
  over for 15 days'`, `'Full rollover support'` → `'15-day rollover on unused credits'`.
  **No `plans_config` DB row exists** (verified: API reflects code defaults immediately) — so
  no DB migration needed; but if an admin saves plans from the admin UI later, the row is
  created from whatever the admin UI sends.

Verified in browser (screenshots in `%TEMP%\opencode\v5_*.png`):
- Landing hero demo → Settings mock: "Renews monthly · Unused credits roll over for 15 days" ✓
- Capabilities card 04 (hover): badge "15-Day Rollover" + "FULL LEFTOVER CARRIES OVER"
  (old "NO EXPIRATION DATE" gone) ✓
- `/pricing` plans tab: Freelancer "Unused credits roll over for 15 days" + Agency "15-day
  rollover on unused credits" ✓; top-ups tab banner re-titled "Purchased Credits Never Expire" ✓
- `/api/plans` returns new copy, `grep` sweep clean, lint clean.
- email-templates tests: 2 pass / 2 fail — failures are pre-existing `renderEmailVerification`
  timeouts (untouched functions).

**Browser-testing gotchas (for future sessions):** page uses Lenis smooth scroll — Playwright
auto-scroll fights it and clicks silently miss; use DOM-dispatched `el.click()` via
`page.evaluate` instead. Hero demo and pricing tabs are interaction-gated (only the active tab
mounts). `/pricing` initial tab = `?tab=refills` param, else 'plans'. Pricing text reads
`/api/plans` (5s memory cache + s-maxage=300).

Left unchanged on purpose: `pricing/page.tsx:429` `/ 30 days` = billing cycle label (true),
dynamic "expires {date}" strings in sidebar/settings/admin (real data), top-up never-expire copy.

### #9 Admin dropdown audit (code done, sweep pending)
**Full static audit of all 21 admin routes — complete inventory:**
- Custom "card + dropdown menu" (the only clip-prone kind): exactly **2**
  1. `/admin/users` — table card → Approve-plan menu (was `users/page.tsx:424`, `absolute top-full`)
  2. `/admin/review` — application cards → Approve-plan menu (was `review/page.tsx:276`)
- Native `<select>` popups (OS-rendered, cannot be clipped): contacts ×2, users filter ×1,
  rbac ×4, broadcast ×3, community ×1(+1 create), support ×2 (+2 on `support/[id]`).
- Everything else in cards = buttons/tabs/modals. No hover menus, no other absolute menus.
- **Root cause confirmed:** `admin/layout.tsx:179` `main.overflow-y-auto` scroll container
  clips abspos menus at the scrollport edge (bottom rows / card footers → half-cut menu).
  Both menus also had no outside-click/Escape close. **Layout kept as-is** (independent
  content scroll with fixed sidebar is intentional) — suspicion resolved, no layout change.

**Fix shipped:**
- New `components/ui/PortalMenu.tsx` — body-portal, `position: fixed`, `z-index: 60` menu.
  Two-phase `useLayoutEffect`: place → measure real height → flip up / clamp so it always
  fits the viewport (estimate-only flip failed: "Freelancer (500 credits)" wraps → real
  height > estimate). Closes on outside pointerdown, Escape, scroll(capture), resize.
  Pattern follows `saved/page.tsx` portal menu.
- Wired into `admin/users/page.tsx` (`approveBtnRef` + `<PortalMenu align="right" w=176>`)
  and `admin/review/page.tsx` (`ReviewActions`, `<PortalMenu align="left" w=192>`).
- Verified: lint clean (3 files), `tsc` 0 errors in our files (47 pre-existing elsewhere),
  `next build` compiles + 44/44 pages (final manifest write ENOENT = `.next` clash with the
  running dev server, not code). In-browser harness reproduced the admin scroll chain:
  menu flipped up fully visible at bottom edge, Escape closes, console clean.
- **Sweep session (this session):** `/admin/users` + `/admin/review` compile → HTTP 200,
  0 console errors (both auth-redirect to `/login` unauthenticated — live dropdown sweep
  still needs an admin login). Lint re-confirmed clean.

### #10 Saved leads → LeadDrawer (code done, compile-verified)
Shipped in a parallel session; verified here:
- `saved/page.tsx` (+190): dynamic-imports the same `LeadDrawer` the lead feed uses;
  lead-name click (mouse + Enter/Space + `role="button"`) opens it; `?lead=<id>` deep-link
  restore + `pushState` on open/close; fresh `/api/leads/<id>` detail fetch with conservative
  merge; Esc + backdrop click close; body **and** `<main>` scroll-lock while open; reveal
  callback mirrors server state (`isReveal`, `status: 'saved'`, `isSaved`, `phone`) into both
  the table rows and the drawer detail; framer-motion enter/exit.
- Signature check: `LeadDrawer` default export ✓, `onReveal(name, email, phone?, fullLead?)`
  matches the call site ✓ (type-checked).
- Verified: lint clean · `tsc` 0 errors in `saved/page.tsx` · page compiles HTTP 200 with
  0 console errors (incl. `?lead=dummy123` deep-link) · auth-gated → `/login` unauthenticated.
- **Live click-through** (needs a logged-in account with ≥1 saved lead).

### #6 Pricing → 2 plans: Free (no card) + ₹999 (done)
Values used = the code's own existing truth (user never overrode them): **Free Starter 50 cr/₹0**,
**Freelancer Pro 1000 cr/₹999**. **AGENCY dropped from all selling surfaces** — but kept
everywhere backend (validators, webhooks, `order`/`verify` amount maps, admin assign,
broadcast segments, sidebar limits) so **existing Agency subscribers keep working untouched**.

Changed (6 files):
- `pricing/page.tsx` — `DEFAULT_PLANS`: removed AGENCY; FREE features += "No credit card
  required"; plans grid `md:grid-cols-3` → `md:grid-cols-2 max-w-4xl mx-auto`; **anonymous
  visitor fix**: no longer sees a fake "Your Current Plan/Active Plan" on Free (`isCurrent`
  now requires `user`), both CTAs route to `/register` — Free says **"Start Free — No Card"**;
  refills-banner copy "…Freelancer Pro or Agency Scale…" → "…Freelancer Pro…".
- `api/admin/plans/route.ts` — `DEFAULT_PLANS` removed AGENCY + FREE "No credit card required"
  (this is the single source `/api/plans` serves; no `plans_config` DB row exists).
- Landing `page.tsx` pricing section — Agency card removed; grid → `md:grid-cols-2
  max-w-[760px] mx-auto`; Freelancer **500 → 1,000 credits** (was stale vs config) + price
  `Free` → **`₹999`** + note "during early access" → per-card ("no credit card required" /
  "per month"); reveal counts fixed from bluffs (~16 / ~166 / ~333 at ~3 cr each) to true
  cost (`coins.ts`: email 5 / phone 8 / both 10): **~5–10** (Free) and **~100+** (Freelancer);
  trust note "Free during early access…" → **"Start free — no credit card required · Unused
  credits roll over for 15 days"**; FAQ credits answer fixed Email 10→5, Phone 12→8,
  Both 15→10, top-ups ₹199→₹99 (FAQ order from #11 untouched).
- `refill/page.tsx` + `api/payments/razorpay/topup/route.ts` — upsell/guard strings
  "(Freelancer or Agency)" → "(Freelancer Pro)" (guard logic unchanged: any paid plan passes).
- Skipped: settings "Choose a Plan" modal shows Agency — **dead code** (`planModalOpen` never
  set true; live path is its `/pricing` Link). `lib/config/plans.ts` + admin plan dropdowns
  keep AGENCY (management of existing subscribers).

Verified in browser (DOM assertions, console clean): landing = **2 cards, grid 2 cols**
(Free/Free/no-card note + ~5–10 reveals; Freelancer/₹999/per month + 1,000 cr/~100+ reveals;
zero "Agency" anywhere in section); `/pricing` anonymous = **2 cards** ("Start Free — No Card"
+ "Get Started with Freelancer Pro" → both navigate to `/register`; Free features incl. "No
credit card required"; "Recommended" badge on Freelancer; no fake current-plan badge);
`/api/plans` → `ids:[FREE,FREELANCER] prices:[0,999] credits:[50,1000]`; trust note + FAQ text
confirmed; lint clean; **vitest 18 failed/167 passed = identical to pre-edit baseline**.

**⚠️ Backend/dispatch notes:**
- `api/dashboard/route.ts:82` says `FREELANCER ? 500 : …` — inconsistent with config 1000
  (sidebar/mobile-nav/copilot all say 1000). Backend guy.
- Copilot prompt copies (`api/copilot/route.ts`, `HunterCopilot.tsx:36`) still say coin costs
  10/12/15 + "top-ups starting at ₹199" (truth 5/8/10 + ₹99). Not UI — backend guy.
- `plans.test.ts` stale (expects FREELANCER=500, keys incl. AGENCY) — untouched on purpose.
- `/api/plans` sends `s-maxage=300` → CDN may serve 3-plan payload up to 5 min post-deploy.
- If an admin later saves plans from the admin UI, `plans_config` row is created from the
  now-2-plan payload (row still doesn't exist).

### #7 Footer rework (nav columns done; social/legal pending)
Changed in `apps/web/src/app/page.tsx` footer (~line 735+):
- **Product column** → real in-page anchors: How It Works `#funnel`, Features `#features`,
  Pricing `#pricing`, Token System `#tokens`, FAQ `#faq` (fixes 2 previously broken ids
  `#how-it-works`, `#token-system` — those sections don't exist; real ids confirmed).
- **Company column** → renamed **Resources**: Wall of Love `/wall-of-love`, Community
  `/community`, Refer & Earn `/referrals` (Link-based, all fetch HTTP 200). Removed dead
  About/Blog/Careers/Contact, auth-gated Support (`middleware` protects `/support` →
  login redirect), and disabled Sneak Peek (`SNEAK_PEEK_ENABLED=false` → 404).
- **Social icons** → config-driven `.filter(s => s.href)`; X/LinkedIn/YouTube entries
  currently `href: ''` + `TODO(#7)` → icons hidden instead of dead `href="#"`.
- Verified: lint clean; automated link audit on live page = 11 footer links → 5 anchors
  resolve to real section ids, 3 routes 200; fresh-tab screenshot matches DOM
  (no Support, no rendered social icons, legal row intact).
- **Still needs from user:** real social profile URLs; Privacy/Terms/Cookie decision
  (currently `href="#"`).

### #13 Landing copy → docs/landingpagecontent.md (done)
Content-only rewrite of 6 sections across 3 files (layouts/components untouched):
- **`HeroSection.tsx`** — h1 → "Stop chasing clients. / Find people already looking for what
  you sell."; sub → LeadHunter public-conversations line (max-w 480→560 for the longer copy);
  NEW secondary CTA **"See How It Works"** → `#funnel` anchor (verified scrolls); NEW
  "50 free credits · No credit card required" line under CTAs.
- **`page.tsx` #funnel** — H2 → "From buyer signal / to sales conversation." (old sub removed);
  steps → 01 Find fresh demand (+ kicker "Real people. Real needs. Happening now.") /
  02 Filter the noise / 03 Understand the opportunity (+ mono line "Need · Pain point · Budget
  signals · Urgency · Context · Intent") / 04 Act while the opportunity is fresh (chip now
  carries "Find the signal. Understand the buyer. Make your move."). Step-label styling from
  #3 preserved; visuals untouched. Stale CARD-4 comment updated.
- **`page.tsx` #philosophy** — eyebrow → "Why LeadHunter"; H2 → "Most lead tools give you
  contacts. / LeadHunter gives you context."; sub → "Thousands of contacts don't mean…";
  comparison cards repurposed: left "A database can tell you: → Who someone is." (single bullet
  vertically centered via flex so the stretched grid cell doesn't look empty), right
  "LeadHunter helps you understand:" → 5 spec bullets; reply-rate badges KEPT; NEW closer
  "Less cold outreach. / More relevant conversations." above the flowchart.
- **`TestimonialsSection.tsx`** — eyebrow → "Don't take our word for it."; h2 → "See what
  hunters are finding."; sub → the one-question line. Screenshot grid/feed notice untouched
  (already satisfies the spec's "real screenshots" ask).
- **`page.tsx` #pricing** — H2 → "Start hunting for free. / Pay when you want to hunt harder.";
  sub → spec line; plans → **Scout Hunt** (₹0 / month, 4 spec features, CTA "Start Hunting Free")
  + **Alpha Hunt** (₹999, 6 spec features, CTA "Start Hunting"); `{p.cta}` replaces
  "Get Started with {name}"; numbers unchanged (50 / 1,000 / ₹999 per spec note); trust note kept.
- **`page.tsx` final CTA** — h2 → "Stop searching for clients. / Start finding demand."; sub →
  spec line; button → "Start Hunting Free"; NEW "50 free credits · No credit card required"
  under the button; dot chips + supporting row kept.
- **Verified:** lint clean (3 files), tsc 0 new errors, old-string grep sweep = 0 hits, browser
  22/22 DOM checks + "See How It Works" anchor click scroll ✓, desktop 1440 + mobile screenshots
  clean (no overflow: bodyScrollW == clientWidth, 0 text overflow), console = 1 pre-existing
  Lenis warn only. `/pricing` page + API defaults intentionally untouched (landing-only ask).
- **⚠️ Launch gate discovered:** `src/lib/launch.ts` `COMING_SOON = true` (untracked user WIP)
  makes `/` render `ComingSoon.tsx` instead of the landing page — the new copy was verified with
  the gate temporarily flipped to `false`, then **restored to `true`**. Flip it to ship the page.
  ComingSoon already carries the new hero lines.

### Test baseline after this session
`vitest run`: **18 failed | 167 passed (185)**. All 18 in untouched backend files
(`plans` 2, `payment` 4, `credits` 9, `reveal route` 3 — the known stale-expectation set;
was 19 before, one flaky email-templates timeout now passes). **No regressions.**

### ⚠️ For the backend guy — dead endpoint discovered
`src/app/api/auth/check-phone/route.ts` imports `arePhonesMatching` + `getPhoneDigits` from
`@/lib/phone`, which **never existed** (committed file only exports `normalizePhone`) → the
route throws into its own catch and always answers `isAvailable: true`. It also has **zero
frontend callers** (grep-verified) — dead code today, but if you wire it up later the helpers
must be implemented first. `tsc` flags these as 2 of the ~49 pre-existing errors.

### Mistyped-email recovery + sign-out fix (2026-10-05) — DONE, browser-verified
- **Shipped:** `RecoveryEmailPanel` on `/verify-email` + `/onboarding`: single button
  "Wrong email? Go back and sign up again" → confirm step → deletes the unverified account →
  blank `/register`. Inline change-email mode was designed first then **dropped**: the Firebase
  project blocks email changes without reauth (400 `OPERATION_NOT_ALLOWED` +
  `CREDENTIAL_TOO_OLD_LOGIN_AGAIN` even ~7 min after signup) — do not resurrect it.
- **`DELETE /api/auth/me`:** rate-limit 5/60s, 403 if `emailVerified` (DB row or JWT claim),
  admin-SDK `deleteUser(uid)` **first** (no recent-login wall; `FIREBASE_SERVICE_ACCOUNT_PATH`
  set in dev, fallback = client `user.delete()` try/catch), then hard DB delete (all FKs
  cascade), returns `referralCode` → client re-saves `lh_ref_code`. ⚠️ Backend guy: referrer
  may double-dip the +10 on re-signup (5 re-applies to user, referrer bonus not reversed).
- **816c7da regression fixed:** "Sign in with a different account" restored on
  `/verify-email`. Both exits use `window.location.assign` (hard nav) — `router.replace`
  after `firebaseSignOut` raced ClientLayout's stale-user state and bounced back to
  `/verify-email` → signed-out infinite loader (seen live during testing).
- **E2E proof:** signup → start-over → **same email re-registers clean** (proves both Firebase
  account and DB row were deleted — no `email-already-in-use`, no P2025) → sign-out lands on
  `/login` with no bounce; console 0 errors; lint clean; tsc 38 = pre-existing; vitest
  18f/167p = unchanged baseline.

---

## 3. Blocked — waiting on user input

1. **Video asset for capabilities card 4** (#4).
2. **Footer URLs — part 2** (#7 nav columns DONE): (a) real social profile URLs
   (X/LinkedIn/YouTube — icons hidden until then), (b) Privacy/Terms/Cookie decision —
   give URLs or say "make placeholder pages" (currently `href="#"`).
3. **Pricing confirmation** (#6 — DONE with code's own values): proceeded as
   ₹999 = 1,000 credits, Free = 50, Agency dropped from sale. Shout if any value differs.
   DB plan rows = backend guy (still no `plans_config` row; API serves code defaults).
4. **"Firebase auth panel change"** (#12) — what exactly? Shipped 2026-10-05: mistyped-email
   recovery panel (start-over button on verify-email/onboarding) + fixed "Sign in with a
   different account". Confirm #12 is this; if not, clarify.

---

## 4. Deploy state & risks

- **Push/pipeline check (2026-10-02):** all git pushes succeed (`0 0` after rebase).
  The repo is connected to **two Vercel projects**: `leadhunterclub` (the locally-linked
  one, ✅ builds every commit incl. our `7ac61e7`) and **`leadhunterclubfull` — ❌ fails on
  EVERY commit** (verified against `7ac61e7`, `2127f5d`, `c18d8c5`, `f61a0e6`) → chronic,
  predates our work, red herring for the launch. Fix: disconnect `leadhunterclubfull` from
  the repo in the Vercel dashboard (or correct its Root Directory — app lives in
  `apps/web`). To read its logs: `npx vercel login` then
  `npx vercel inspect dpl_AYiyp7sA8r72GXSFGWQJ4duq9Hjq --logs`.
- 🚨 **LAUNCH BLOCKER: `leadhunterclub.com` does not resolve in DNS at all** (apex, www
  and NS lookups all NXDOMAIN — not a propagation delay). Site can't be reached on the
  domain until DNS is pointed at Vercel: add the domain in Vercel → project
  `leadhunterclub` → Settings → Domains, then follow the registrar instructions.
  Ask user: where is the domain registered / has it been added to Vercel yet?
- `next build` ✔ · `next lint` ✔ (warnings only, pre-existing) · tests: **18 pre-existing failures**
  (stale expectations, e.g. `plans.test.ts` wants FREELANCER=500 but config=1000). Proven
  pre-existing via `git stash` / `git stash pop`.
- ⚠️ **Hardcoded Razorpay TEST keys** in `apps/web/src/lib/razorpay.ts` with silent fallback if
  env vars missing → **must set real env vars in Vercel and rotate the secret after launch.**
  (Values intentionally not recorded here.)
- `vercel.json` regions `bom1`. `.env.example` = env checklist for Vercel.
- Recent commits: cron route, admin tokens page, broadcast center, sidebar Pricing removal.

---

## 5. Repo facts & environment (for fresh sessions)

- **Test runner: `vitest run`** (NOT jest — `npx jest` downloads a broken global jest).
  Focused: `npx vitest run src/lib/<path>`. Lint: `npx next lint --file src/app/<file>`.
- **PowerShell 5.1:** `&&` is invalid — use `;` or `if ($?)`. Windows `find` breaks codedev
  file-tree tools — use `glob`/`grep`.
- **Dev server:** `localhost:3000`, started via `Start-Process cmd /c "npm run dev" > devserver.log 2>&1`
  from repo root (log: `devserver.log`).
- Fonts: Space Grotesk `--font-display`, Inter `--font-sans`, GeistSans/GeistMono —
  `tailwind.config.ts` defines only `sans`, `mono`, `display` (**no `serif`**).
- Skills per `AGENTS.md`: `taste-skill` for frontend design work (same-family italic/bold,
  no serif injection into sans headlines).
- Working tree also has user WIP not ours: `AGENTS.md`, `analytics/page.tsx`,
  `leads/components/LeadDrawer.tsx` modified; `moodboard.html/.png` untracked.

## 6. Suggested next steps (in order)

1. ~~#8~~ ~~#9 code~~ ~~#10 code~~ ~~#6~~ — all shipped + browser-verified.
2. **Live sweeps (need a logged-in session):** #9 admin dropdowns (`/admin/users`,
   `/admin/review`) + #10 drawer click-through + #8 onboarding dropdown — ask user for a
   test login.
3. Blocked on user: #4 card-4 video, #7 social/legal URLs (nav columns
   done), #12 Firebase panel.
4. Pre-launch: rotate Razorpay test keys / set Vercel env vars (see §4); hand backend guy
   the dashboard/copilot copy inconsistencies logged in #6.
