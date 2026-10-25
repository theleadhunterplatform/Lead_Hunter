# AGENTS.md — Lead Hunter Master Guide for AI Agents

> **Purpose:** This file is the single source of truth for any AI agent working on the `Lead Hunter` codebase. It outlines the complete system architecture, multi-service boundaries, data models, lead processing pipelines, credit economics, auth flows, operational commands, and critical engineering gotchas.

---

## 1. Executive Overview & Product Context

**Lead Hunter** (operating publicly as **The Lead Hunter Club** / `leadhunterclub.com`) is a B2B demand-generation and intent-discovery platform for freelancers, agencies, and service providers ("hunters").

### The Problem It Solves
Instead of traditional cold outreach where hunters mass-scrape outdated directory lists and pitch uninterested prospects, Lead Hunter monitors live public discussions (LinkedIn, X/Twitter, Reddit, Threads, and target creator/influencer comments) where decision-makers actively state urgent problems or request contractor recommendations.

### The Value Proposition
- **High Intent:** Identifies real people asking for services right now.
- **Context Over Contacts:** Supplies deep AI-extracted buyer intelligence (budget signals, pain points, task scope, urgency) before outreach.
- **Automated Verification & Enrichment:** Extracts and validates decision-maker emails, phone numbers, and profile URLs.
- **Controlled Supply:** Leads are scored, filtered, admin-approved, and sold with dynamic credit pricing.

---

## 2. System Architecture & Tech Stack

The repository is organized as a multi-service monorepo:

```
Lead_Hunter/
├── backend/            # Core API, Scraping, AI Pipeline, Workers, Cron, WhatsApp Bot
├── frontend/           # Next.js 14 Web Application (Monorepo: apps/web)
├── ai/                 # Python FastAPI Microservice (OCR & Relevancy Classifier)
├── scripts/            # Dev startup orchestration, DB sync, audio utilities
├── Docs/               # Product specs, milestone proof engines, guides
├── ONBOARD.md          # Production launch checklist & operational runbook
├── RENDER-DEMO.md      # Cloud deploy guide (Render / PaaS)
├── AZURE-DEPLOY.md     # Production VM deployment guide
└── docker-compose.yml  # Local Redis container configuration
```

### Services Breakdown

| Service | Technology | Port | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Backend** | Node.js (Express 5), TypeScript, Prisma ORM, BullMQ, Redis, Baileys | `5001` | Ingestion, Apify scraping, lead qualification pipeline, contact enrichment, OpenRouter LLM intelligence, WhatsApp drops, Admin APIs, Scoped RBAC. |
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Prisma Client, Firebase Auth, Razorpay SDK | `3000` | Landing page, hunter feed (`/leads`), lead drawer, credit ledger, saved leads, outreach console, user settings, billing, admin management portal (`/admin`). |
| **AI Service** | Python 3.10+, FastAPI, Uvicorn, scikit-learn, EasyOCR, Pillow, OpenCV, SentenceTransformers | `8000` | Local ML text classification (`/classify`), image text extraction (`/ocr`), and model retraining (`/train`) with holdout validation and automatic rollback. |
| **Redis** | Redis 7 (Local / Docker / Memurai / Upstash) | `6379` | BullMQ background job queues, rate limiting, distributed lock management, cache. |

---

## 3. Database Architecture & Dual ORM Setup

The platform uses **Prisma** across both Backend and Frontend, interacting with a shared PostgreSQL database in production (hosted on Supabase) or SQLite for offline local development.

### 1. Database Modes (`DB_MODE`)
- **`supabase` (Production):** PostgreSQL connected via `DATABASE_URL` (pooler) and `DIRECT_URL`.
- **`local` (Development):** SQLite database located at `backend/data/lead-hunter.db`.

### 2. Dual Schema Alignment
Both services maintain Prisma schemas that map to the underlying database tables:
- `backend/prisma/schema.prisma` (PostgreSQL) & `backend/prisma/schema.sqlite.prisma` (SQLite)
- `frontend/apps/web/prisma/schema.prisma` (PostgreSQL)

> ⚠️ **Critical Rule:** If you add or alter columns on shared tables (`users`, `lead_posts`, `settings`, `credit_accounts`, `payments`, `roles`), you must ensure **both** schemas stay aligned.

### 3. Key Entities & Database Models

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │──────<│  CreditAccount  │       │   SourceProfile │
│  (Firebase UID) │       └─────────────────┘       │   (Watchlists)  │
└────────┬────────┘                                 └────────┬────────┘
         │                                                   │
         ├──────────────────┐                                │ scrapes
         │                  │                                ▼
┌────────▼────────┐   ┌─────▼───────────┐           ┌─────────────────┐
│  UserLeadState  │   │  RoleAssignment │           │     Keyword     │
│ (Saved/Revealed)│   └─────────────────┘           └────────┬────────┘
└────────┬────────┘                                          │
         │                                                   │ scrapes
         ▼                                                   ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    LeadPost     │──────<│      Claim      │       │    ApifyKey     │
│  (Opportunity)  │       │ (Token/Outreach)│       │(Quota/Rotation) │
└────────┬────────┘       └─────────────────┘       └─────────────────┘
         │
         ├──────< LeadIntelligence (LLM Analysis)
         ├──────< ScrapedPost (Audit / Dedup)
         └──────< UserLeadState (Per-hunter view)
```

- **`User` (`users`):** Represents hunters and administrators.
  - Primary Key: `id` (Firebase Auth UID on frontend; UUID on backend API).
  - Status: `PENDING` (awaiting manual/automated onboarding approval), `ACTIVE`, `REJECTED`, `SUSPENDED`.
  - Subscription: `plan` (`FREE`, `FREELANCER`, `AGENCY`), `tokens` (backend legacy field), `creditAccount` (frontend ledger).
- **`LeadPost` (`lead_posts`):** The core unit of value.
  - `post_id` + `platform`: Unique composite constraint (`linkedin`, `twitter`, `reddit`, `threads`, `manual`).
  - `status`: `pending` → `relevant` (or `irrelevant`).
  - `review_status`: `awaiting_review` → `approved` (or `rejected`). Only `approved` + `relevant` leads appear in the hunter feed.
  - `credit_cost`: Optional manual override; if null, calculated dynamically from contact availability.
  - `intelligence`: JSON/Markdown analysis produced by LLM.
  - `contact_info`: JSON payload with extracted emails, phone numbers, LinkedIn public ID, company name, and verification metadata.
  - `niche`: Category classification (e.g. `UI/UX Design`, `Web Development`, `Paid Ads & Marketing`, `AI & Automation`).
- **`CreditAccount` (`credit_accounts`):** Three-tier wallet system:
  - `subscriptionBalance`: Base monthly allowance (50 for Free, 1000 for Freelancer).
  - `rolloverBalance` + `rolloverExpiresAt`: Unused credits that roll over for exactly **15 days**.
  - `bonusBalance`: Earned via referrals or milestone bounties (never expires).
- **`Claim` (`claims`) & `UserLeadState` (`user_lead_states`): Tracks lead unlocks per user. Ensures that once a lead's contact is unlocked by a hunter, re-opening does not deduct credits again.
- **`MilestoneProof` (`milestone_proofs`):** Viral bounty proofs uploaded by hunters (screenshots of positive client replies, meetings scheduled, or deals closed) for admin credit grants.
- **`Setting` (`settings`):** Dynamic runtime configurations stored as JSON (Apify keys, AI models, automation toggles, WhatsApp alert templates).

---

## 4. End-to-End Lead Ingestion & Processing Pipeline

The backend executes a 6-stage background processing pipeline driven by **BullMQ** queues backed by Redis:

```
[1. Scrape] ────► [2. Gate & Dedup] ────► [3. AI Qualification]
                                                  │
                                          (If Relevant)
                                                  ▼
[6. Hunter Feed] ◄── [5. Titling & Intel] ◄── [4. Enrichment]
```

### Stage 1: Ingestion & Scraping (`scraper-queue`)
- Triggered by cron (`*/30 * * * *`) or admin manual trigger (`POST /api/scrapers/keyword/:id` or `/api/targets/scrape-all`).
- Pulls search queries from `keywords` or target influencer URLs from `source_profiles`.
- **Multi-Engine Execution & Fallbacks:**
  - **Apify (Default Primary):**
    - LinkedIn Search: `harvestapi/linkedin-post-search`
    - Twitter/X Search: `watcher.data/search-x-by-keywords`
    - Reddit Search: `practicaltools/apify-reddit-api`
    - Threads Search: `watcher.data/search-threads-by-keywords`
    - Automated multi-key rotation (`apify_keys`) to bypass quota exhaustion.
  - **Scrapedog (Primary or Fallback):**
    - Uses Scrapedog Web Scrape & Google SERP API (`scrapedog-scraper.service.ts`) for resilient platform searches across Reddit, LinkedIn, Twitter/X, and Threads.
  - **Crawlbase (Primary or Fallback):**
    - Uses Crawlbase Crawling & Scraper API (`crawlbase-scraper.service.ts`) with rotating proxies and JavaScript rendering for anti-bot bypass.
  - Configured dynamically via `PRIMARY_SCRAPER_ENGINE` and `FALLBACK_SCRAPER_ENGINES` or Admin settings (`/api/settings/scraper-engines`).

### Stage 2: Deduplication & Gating Filters
Before saving into `lead_posts`, the item must pass strict gates:
1. **Age Filter:** Skips any post older than **48 hours (2 days)** to ensure high response probability.
2. **Saturation Filter:** Skips posts with **> 100 comments** (market is already oversaturated with competitor pitches).
3. **Keyword Splitting:** Multi-word keywords are split into precise phrase variants.
4. **Duplicate Detection:** Checks against `post_id + platform`, normalized URL, and duplicate content hashing.

### Stage 3: AI Qualification & Relevancy (`ocr-queue`)
Evaluated via `qualifyLeadPost()` in `backend/src/services/qualification.service.ts`:
1. **Hard Rules First:**
   - Detects clear employment/full-time job postings (`[Hiring] Full-time SWE at Meta`) and flags as `irrelevant`.
   - Detects contractor/agency requests (`Looking for a freelance UI/UX designer`) and flags as hard `relevant`.
2. **Local Machine Learning Model:**
   - Sends post content to the Python AI service (`http://localhost:8000/classify`).
   - Uses TF-IDF or Sentence-Transformers (`all-MiniLM-L6-v2`) + Logistic Regression.
   - High-confidence model predictions (confidence ≥ 78%) can nudge or override rule boundaries.
3. If classified as `relevant`: Sets `review_status: 'awaiting_review'` and triggers auto-enrichment.

### Stage 4: Contact Enrichment (`enrichment-queue`)
Evaluated via `enrichLeadPost()` in `backend/src/services/enrichment.service.ts`:
1. Extracts inline emails/phones found directly in the post text (`post_text`).
2. If author LinkedIn profile is present, queries external intelligence providers in cascading waterfall:
   - **ContactCompass API**
   - **Hunter.io API**
   - **Apollo.io API**
   - **ContactOut API**
3. Flags status as `found` (verified contact), `partial` (unverified contact or profile-only), or `not_found`.

### Stage 5: AI Titling & Intelligence Analysis (`title-queue` & `intelligence-queue`)
1. **Punchy Titling (`titlingWorker`):** Generates an action-oriented headline summarizing the client's problem (e.g. *"D2C Brand Needs Performance Marketer for Q4 Meta Ads Scale"*).
2. **Buyer Intelligence (`intelligenceWorker`):** Calls OpenRouter LLM (`google/gemini-2.0-flash-001` or Groq `llama-3.1-8b-instant`) to synthesize:
   - Client Niche & Industry
   - Task Scope & Requirements
   - Pain Point & Urgency Level
   - Budget & Buying Signals
   - Recommended Angle of Approach

### Stage 6: Admin Review & Community Drops
1. Admin reviews qualified leads at `/admin/leads` or `/admin/review`.
2. Upon clicking **Approve**:
   - `review_status` becomes `approved`.
   - Lead becomes visible to all active hunters on `/leads`.
   - WhatsApp Bot broadcasts an alert to the community WhatsApp group with niche tags and direct link.

---

## 5. Credit Economics & Pricing Structure

The platform uses a value-based credit consumption model:

### Dynamic Reveal Costs (`coins.ts`)
The cost to unlock a lead's contact info is determined by the quality of data available:
- **Phone & Email:** `15 credits`
- **Phone only:** `12 credits`
- **Email only:** `10 credits`
- **Profile link only:** `5 credits`
- *(Admin custom cost override takes priority if set)*.

### Plans & Quotas
| Plan | Price | Monthly Credits | Rollover Rule |
| :--- | :--- | :--- | :--- |
| **Free Starter** | ₹0 / mo | 50 credits | Unused credits roll over for **15 days**; no card required. |
| **Freelancer Pro** | ₹999 / mo | 1,000 credits | Unused credits roll over for **15 days**. |

### Credit Top-Up Packs (One-Time Purchases)
Purchased top-up credits **never expire** (stored in `bonusBalance`):
- **125 credits:** ₹199
- **275 credits:** ₹399
- **450 credits:** ₹599

### Deductions Order
When a user unlocks a lead, credits are deducted in the following priority order:
1. `rolloverBalance` (consumed first before they expire).
2. `subscriptionBalance` (standard plan allowance).
3. `bonusBalance` (purchased top-ups and referral rewards).

---

## 6. Authentication & User Approval Flow

The application features a hybrid authentication and security architecture:

```
[Register: /register] ────► [Phone / Email Verification]
                                     │
                                     ▼
[Pending Review: /pending-approval] ◄── [Complete Onboarding: /onboarding]
         │
         ├─────────────────────────────────┐
         ▼ (Admin Approves)                ▼ (Admin Rejects)
[/leads Feed & Dashboard]          [Access Denied / Notification]
```

1. **User Sign Up:**
   - Frontend registers user through **Firebase Auth** or Supabase Phone OTP.
   - Synchronizes record into the PostgreSQL `User` table with status `PENDING`.
2. **Onboarding Questionnaire (`/onboarding`):**
   - User specifies services offered, portfolio links, outreach experience, and preferred lead niches.
3. **Approval Gate (`ClientLayout.tsx`):**
   - If `REQUIRE_SIGNUP_APPROVAL=true` in backend/frontend, users cannot view the lead feed until an admin changes their status to `ACTIVE` in `/admin/users`.
   - Non-approved users are automatically routed to `/pending-approval`.
4. **Backend API Authentication:**
   - Backend routes use JWT Access Tokens (15m expiry) and Refresh Tokens (7d expiry) with Scoped RBAC (`protect`, `authorize`).
   - The frontend API proxy (`external-api/client.ts`) authenticates with the backend using system credentials (`EXTERNAL_API_EMAIL` and `EXTERNAL_API_PASSWORD`).

---

## 7. Developer Cheatsheet & Operational Commands

### 1. Starting the Entire Stack Locally
Run from the root directory:
```bash
npm run dev
```
This launches `concurrently` managing 4 processes:
1. **Redis Dev Server:** Checks for local Redis on `6379`, fallback to Docker or embedded `redis-memory-server`.
2. **Backend API:** `http://localhost:5001` (Nodemon + ts-node)
3. **Frontend Web App:** `http://localhost:3000` (Next.js 14)
4. **Python AI Service:** `http://localhost:8000` (Uvicorn + FastAPI)

### 2. Individual Service Commands

#### Backend (`/backend`)
```bash
cd backend
npm run dev                     # Start dev server on :5001
npm run build                   # Generate Prisma client and compile TypeScript
npm run db:push:local           # Push schema to local SQLite DB
npm run db:push:supabase        # Push schema to Supabase PostgreSQL DB
npm run seed:claimable          # Seed verified, claimable leads for instant testing
npm run db:cleanup-junk-leads   # Purge obsolete or unverified scraped records
```

#### Frontend (`/frontend`)
```bash
cd frontend
npm run dev -w apps/web         # Start Next.js on :3000
npm run build -w apps/web       # Production build
npm run lint -w apps/web        # ESLint check
npm run test -w apps/web        # Vitest test suite
```

#### Python AI Service (`/ai`)
```bash
cd ai
# Install dependencies
pip install -r requirements.txt
# Run service manually
python server.py                # Runs on :8000
```

---

## 8. Environment Variables Reference

### Backend (`backend/.env`)
```env
PORT=5001
NODE_ENV=development
DB_MODE=supabase                        # 'supabase' (Postgres) or 'local' (SQLite)
DATABASE_URL=postgresql://...           # Supabase connection pooler URL
DIRECT_URL=postgresql://...             # Direct Postgres connection URL
REDIS_URL=redis://127.0.0.1:6379        # Local or Upstash Redis URL
USE_CLOUD_REDIS=false                   # Set true to use remote Redis in dev

JWT_ACCESS_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
SETTINGS_ENCRYPTION_KEY=32_byte_base64_key
FRONTEND_URL=http://localhost:3000

APIFY_API_TOKEN=apify_api_...
OPEN_ROUTER_API=sk-or-v1-...
OPEN_ROUTER_INTEL_MODEL=google/gemini-2.0-flash-001

RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

RESEND_API_KEY=re_...
EMAIL_FROM=Lead Hunter Club <noreply@theleadhunterclub.com>

REQUIRE_SIGNUP_APPROVAL=true
WHATSAPP_ENABLED=true
```

### Frontend (`frontend/apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
EXTERNAL_API_EMAIL=admin@leadhunter.app
EXTERNAL_API_PASSWORD=admin_password

DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Firebase Auth
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# Dev / Testing Flags (Never commit enabled in prod)
# DEMO_LEADS=1                          # Injects mock leads into LeadDrawer
```

---

## 9. Critical Engineering Gotchas & Rules for AI Agents

1. **Launch Gate & Dev Preview:**
   - In `frontend/apps/web/src/lib/launch.ts`, `COMING_SOON = true` causes `/` to render `ComingSoon.tsx`.
   - To preview the real landing page during development without flipping the global flag, visit `http://localhost:3000/?preview=1`.
2. **Git Workflow — Rebase Before Push:**
   - Always execute `git pull --rebase origin main` before pushing commits to prevent non-fast-forward push rejections.
   - If working tree is dirty, use `git stash push -m "wip"`, rebase, push, then `git stash pop`.
3. **PowerShell Encoding Traps (Windows):**
   - Never use PowerShell `Get-Content | Set-Content` on files with non-ASCII or UTF-8 characters (like quotes, dashes, or rupee symbols ₹). It will corrupt UTF-8 encoding.
4. **Stale Vitest Baseline:**
   - In `frontend/apps/web`, running `npm run test` reports 18 failing tests in `plans.test.ts`, `payment`, and `credits`. These are known stale unit tests asserting on legacy pricing structures and are not regressions.
5. **Lenis Smooth Scroll in Tests:**
   - The landing page uses Lenis smooth scrolling. Standard Playwright automated click actions can miss target coordinates due to scroll inertia; always use DOM-dispatched clicks (`element.click()`) inside `page.evaluate()`.
6. **Next.js Webpack Cache Invalidation:**
   - If `/pricing` or other dynamic routes start throwing `500 Cannot find module './XXXX.js'`, kill the server, delete `.next/`, and restart `npm run dev`.
7. **Credit Terminology:**
   - Always refer to user balance as **"Credits"** (not "tokens" or "coins") across all frontend UI components and user communications.
8. **NEVER Stage or Commit ANY `.env` or `.env.example` Files:**
   - **Strict, Non-Negotiable Rule:** Never stage, add (`git add`), or commit any `.env` or `.env.example` (or `.env.local`, `.env.*`) files under any circumstances. Keep all environment and template files uncommitted.

---

## 10. Summary Directory Map

```
c:\work\Lead_Hunter\
├── AGENTS.md                          # <-- YOU ARE HERE: Master guide for AI agents
├── ONBOARD.md                         # Production readiness & admin go-live checklist
├── RENDER-DEMO.md                     # Render cloud hosting setup
├── AZURE-DEPLOY.md                    # Azure VM production operations
├── backend/
│   ├── prisma/schema.prisma           # Backend PostgreSQL schema
│   ├── prisma/schema.sqlite.prisma    # Backend local SQLite schema
│   └── src/
│       ├── index.ts                   # Express server entry point & route registration
│       ├── services/                  # Business logic (Scraping, AI, WhatsApp, Payments)
│       ├── workers/                   # BullMQ async queue processors
│       ├── cron/                      # Scheduled recurring jobs (Scraper, token reset)
│       └── models/                    # DB access layer wrapping Prisma
├── frontend/
│   ├── AGENTS.md                      # Frontend-specific instructions & taste skill guidelines
│   ├── PROGRESS.md                    # Frontend live work log & cross-session checklist
│   └── apps/web/
│       ├── prisma/schema.prisma       # Frontend PostgreSQL schema
│       └── src/
│           ├── app/                   # Next.js App Router (pages & internal API endpoints)
│           │   ├── (public)/          # Landing, pricing, legal, login, register
│           │   ├── leads/             # Core hunter feed & LeadDrawer
│           │   └── admin/             # Full admin control suite
│           └── lib/                   # Shared helpers, credit calculations, external API client
└── ai/
    ├── main.py                        # FastAPI endpoints for /ocr, /classify, /train
    └── classifier.py                  # Scikit-Learn text classifier & holdout rollback logic
```
