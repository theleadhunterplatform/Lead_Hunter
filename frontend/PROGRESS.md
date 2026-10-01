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
| 1 | Hero image — replace `/images/hero image 2.png` in `HeroSection.tsx:2243` | ⛔ blocked (needs asset from user) |
| 2 | Hero font mismatch — headline line 2 used undefined `font-serif` | ✅ done |
| 3 | Bento grid — Step 02 overlap on hover + unify Step 01–04 labels | ✅ done |
| 4 | Capabilities card 4 — replace `CreditEconomicsInteractiveVisual` with video | ⛔ blocked (needs asset from user) |
| 5 | Rollover copy → 15 days everywhere | ✅ done + visually verified |
| 6 | Pricing → 2 plans only: Free (no card) + ₹999 — landing + `/pricing` | ✅ done + browser-verified |
| 7 | Footer — rework nav columns + real social links | 🟡 nav columns ✅ done + browser-verified; social/legal URLs pending from user |
| 8 | Onboarding — real-time email/number validation; experience → Beginner 6–12mo / Intermediate 1–3yr / Expert 3–6yr | ✅ done |
| 9 | Admin UI — audit every section's dropdowns (z-index/overflow clipping) & fix | ✅ code + harness-verified (sweep of the 2 real admin pages needs admin login) |
| 10 | Saved leads — wire `LeadDrawer` popup on lead name click (like lead feed) | ✅ code + compile-verified (click-through needs login) |
| 11 | FAQ reorder — landing FAQ `page.tsx` from 1,2,3,4 → 1,4,2,3 | ✅ done + visually verified |
| 12 | "Firebase auth panel" change | ❓ unclear — awaiting user clarification |

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

### Dev-server incident (resolved)
- Mid-session `/pricing` started returning `500 Cannot find module './4522.js'` (stale webpack
  cache after hot reloads of route files). Fix: kill :3000, `Remove-Item .next -Recurse -Force`,
  restart `npm run dev`. If clicks mysteriously do nothing after heavy editing → do this first.

## 2. Completed work (don't redo)

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

---

## 3. Blocked — waiting on user input

1. **Hero image asset** (#1) — new file to replace `/images/hero image 2.png`.
2. **Video asset for capabilities card 4** (#4).
3. **Footer URLs — part 2** (#7 nav columns DONE): (a) real social profile URLs
   (X/LinkedIn/YouTube — icons hidden until then), (b) Privacy/Terms/Cookie decision —
   give URLs or say "make placeholder pages" (currently `href="#"`).
4. **Pricing confirmation** (#6 — DONE with code's own values): proceeded as
   ₹999 = 1,000 credits, Free = 50, Agency dropped from sale. Shout if any value differs.
   DB plan rows = backend guy (still no `plans_config` row; API serves code defaults).
5. **"Firebase auth panel change"** (#12) — what exactly?

---

## 4. Deploy state & risks

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
3. Blocked on user: #1 hero image, #4 card-4 video, #7 social/legal URLs (nav columns
   done), #12 Firebase panel.
4. Pre-launch: rotate Razorpay test keys / set Vercel env vars (see §4); hand backend guy
   the dashboard/copilot copy inconsistencies logged in #6.
