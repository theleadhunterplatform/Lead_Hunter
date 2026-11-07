# Lead Hunter — Master Project Index & File Map

> **Purpose:** This file is a comprehensive index of all directories, files, services, routes, and workflows in the **Lead Hunter** (`leadhunterclub.com`) codebase. Include this document (or reference it) in any AI prompt to provide instant, complete context across all services.

---

## 1. System Overview & Monorepo Structure

Lead Hunter is an AI-driven B2B lead discovery platform monitoring social media (LinkedIn, Reddit, X/Twitter, Threads) for real-time buyer intent.

```
Lead_Hunter/
├── backend/            # Express 5 + TypeScript + Prisma + BullMQ (Port 5001)
├── frontend/           # Next.js 14 App Router + Tailwind + Framer Motion (Port 3000)
│   └── apps/web/       # Main Next.js web application
├── ai/                 # Python FastAPI + scikit-learn + SentenceTransformers (Port 8000)
├── scripts/            # Root orchestration & Redis start scripts
├── Docs/               # Technical specs, architecture specs, bounty engines
├── AGENTS.md           # Master system rules, architectural boundaries & constraints
├── ONBOARD.md          # Production launch checklist & cloud runbook
├── PROJECT_INDEX.md    # <-- YOU ARE HERE: Full repository index
└── docker-compose.yml  # Local Redis 7 container
```

---

## 2. Backend Service (`backend/`)
**Runtime:** Node.js, Express 5, TypeScript, Prisma ORM, BullMQ, Redis.  
**Port:** `5001`  
**Primary Database:** PostgreSQL (Supabase) via `DATABASE_URL` / `DIRECT_URL` (or local SQLite via `backend/data/lead-hunter.db`).

### Directory & File Map
```
backend/
├── prisma/
│   ├── schema.prisma                  # PostgreSQL production schema (Supabase)
│   └── schema.sqlite.prisma           # SQLite local fallback schema
├── scripts/
│   ├── local-login.ts                 # Interactive Playwright login for burner LinkedIn accounts (stealth mode)
│   ├── local-scraper.ts               # Standalone HunterCrawler script (scrapes creator comments for buyer posts)
│   ├── diagnose-enrichment.ts         # External email/phone enrichment diagnostic runner
│   ├── prisma-generate.js             # Dual schema generator helper
│   └── test-db-connection.ts          # Validates Supabase/PostgreSQL connectivity
├── src/
│   ├── index.ts                       # Server bootstrap, Express setup, route mounting, cron initializer
│   ├── cleanup-indexes.ts             # Database index optimization utility
│   ├── config/
│   │   ├── index.ts                   # Master config loader (ports, secrets, scraper keys, BullMQ settings)
│   │   ├── db.ts                      # Prisma client initialization & connection lifecycle
│   │   ├── database-env.ts            # Dynamic environment resolver (Postgres vs SQLite)
│   │   └── swagger.ts                 # OpenAPI / Swagger API documentation configuration
│   ├── controllers/
│   │   ├── ai.controller.ts           # Endpoints for LLM classification & OCR triggers
│   │   ├── apify-key.controller.ts    # Apify API key rotation & quota endpoints
│   │   ├── auth.controller.ts         # Hunter & admin authentication (JWT, register, login)
│   │   ├── automation.controller.ts   # System cron automation toggles & quiet hours control
│   │   ├── contact.controller.ts      # Contact reveal, claim logging, manual contact edits
│   │   ├── crm.controller.ts          # Pipeline management for saved leads
│   │   ├── dashboard.controller.ts    # Lead metrics, conversion graphs, admin revenue stats
│   │   ├── google-sheets.controller.ts# Google Sheets lead export integrations
│   │   ├── keyword.controller.ts      # Keyword CRUD & manual scraper triggers
│   │   ├── leaderboard.controller.ts  # Hunter community rankings & outreach metrics
│   │   ├── outreach.controller.ts     # Cold email/DM generation & outreach tracking
│   │   ├── payment.controller.ts      # Razorpay order creation, webhooks, credit grants
│   │   ├── plan.controller.ts         # Subscription tier configurations & limits
│   │   ├── post.controller.ts         # LeadPost CRUD, approval, status toggling, feeds
│   │   ├── rbac.controller.ts         # Role-based access control (Roles, Permissions)
│   │   ├── scraper-key.controller.ts  # Multi-engine scraper pool management (Crawlbase, Scrapedog, etc.)
│   │   ├── scraper.controller.ts      # Scraper queue execution & failover routing
│   │   ├── target.controller.ts       # Watchlist source profiles (influencers/creators)
│   │   ├── user-approval.controller.ts# Admin onboarding questionnaire approval workflow
│   │   └── whatsapp.controller.ts     # Baileys WhatsApp bot alert dispatch & session state
│   ├── cron/
│   │   ├── leadScraper.ts             # Scheduled scraping cron (10 AM - 6:30 PM IST, pauses at 7 PM)
│   │   ├── keepAlive.ts               # Cloud ping heartbeat preventing PaaS idle sleep
│   │   └── tokenReset.ts              # Monthly subscription credit reset (1st of month)
│   ├── middleware/
│   │   ├── async.ts                   # Async try/catch wrapper for controllers
│   │   ├── auth.ts                    # JWT authentication & role-based route guard (`protect`, `authorize`)
│   │   ├── auth-rate-limit.ts         # Rate limiting for auth endpoints with internal proxy bypass
│   │   ├── error.ts                   # Global HTTP error handler
│   │   ├── extension-api-key.ts       # Chrome extension API key verification
│   │   ├── platform-admin.ts          # Superadmin route protection
│   │   └── validate.ts                # Zod request validation middleware
│   ├── models/                        # Prisma database abstraction layer
│   │   ├── user.model.ts              # Hunters and administrators
│   │   ├── lead-post.model.ts         # Opportunity records, status, contacts, reviews
│   │   ├── claim.model.ts             # Lead unlock & credit deduction records
│   │   ├── keyword.model.ts           # Monitored search terms
│   │   ├── source-profile.model.ts    # Monitored creator/influencer profile URLs
│   │   ├── setting.model.ts           # Dynamic runtime configurations (stored as JSON)
│   │   ├── apify-key.model.ts         # Apify key rotation pool
│   │   ├── lead-intelligence.model.ts # LLM synthesized intelligence records
│   │   ├── scraped-post.model.ts      # Raw scraped posts for deduplication audit
│   │   ├── audit-log.model.ts         # Security & administrative audit events
│   │   ├── cron-log.model.ts          # Background job execution logs
│   │   ├── organization.model.ts      # Multi-tenant organization groups
│   │   ├── role.model.ts              # RBAC roles
│   │   ├── permission.model.ts        # Granular permissions
│   │   ├── role-assignment.model.ts   # User role assignments
│   │   └── user-permission.model.ts   # Direct user permission overrides
│   ├── queues/
│   │   ├── index.ts                   # BullMQ queue instances (scraper, enrichment, title, intel, OCR)
│   │   ├── connection.ts              # Redis connection wrapper for BullMQ
│   │   └── worker-options.ts          # Shared concurrency, backoff, and retry options
│   ├── routes/                        # Express API route declarations
│   │   ├── admin.routes.ts            # Admin-only operations
│   │   ├── ai.routes.ts               # OCR & classification endpoints
│   │   ├── apify-key.routes.ts        # Apify key pool endpoints
│   │   ├── auth.routes.ts             # Login, register, token refresh
│   │   ├── crm.routes.ts              # Hunter CRM pipeline
│   │   ├── dashboard.routes.ts        # Analytics & metrics
│   │   ├── google-sheets.routes.ts    # Google Sheets export
│   │   ├── keyword.routes.ts          # Keyword management
│   │   ├── leaderboard.routes.ts      # Community leaderboard
│   │   ├── onboarding.routes.ts       # Hunter onboarding questionnaire
│   │   ├── outreach.routes.ts         # Outreach console & messaging
│   │   ├── payment.routes.ts          # Billing, checkout, Razorpay webhooks
│   │   ├── plan.routes.ts             # Pricing plans
│   │   ├── post.routes.ts             # Leads feed, unlock, manual post creation
│   │   ├── rbac.routes.ts             # RBAC role & permission management
│   │   ├── scraper-key.routes.ts      # Scraper pool settings
│   │   ├── scraper.routes.ts          # Scraper triggers & engine routing
│   │   ├── setting.routes.ts          # Runtime key/value settings
│   │   ├── target.routes.ts           # Source profile targets
│   │   └── whatsapp.routes.ts         # WhatsApp community alert triggers
│   ├── schemas/                       # Zod validation schemas
│   │   ├── auth.schema.ts
│   │   ├── keyword.schema.ts
│   │   ├── post.schema.ts
│   │   ├── target.schema.ts
│   │   └── apify-key.schema.ts
│   ├── services/                      # Core business logic & integrations
│   │   ├── hunter-crawler.service.ts  # Native Playwright & SERP scraper engine with proxy support
│   │   ├── linkedin-voyager.service.ts# Direct LinkedIn Voyager API client
│   │   ├── scraper.service.ts         # Master scraper engine manager & routing dispatcher
│   │   ├── target-scraper.service.ts  # Target profile comment scraping workflow
│   │   ├── scraper-producer.service.ts# Enqueues keyword & watchlist jobs for BullMQ
│   │   ├── scraper-key.service.ts     # Multi-key rotation for Scrapedog, Crawlbase, ScrapingBee, Zyte
│   │   ├── scrapedog-scraper.service.ts# Scrapedog API integration
│   │   ├── crawlbase-scraper.service.ts# Crawlbase API integration
│   │   ├── scrapingbee-scraper.service.ts# ScrapingBee API integration
│   │   ├── zenrows-scraper.service.ts # ZenRows API integration
│   │   ├── apify.service.ts           # Apify actor client & multi-key rotation
│   │   ├── qualification.service.ts   # Lead qualification (hard rules + AI classifier)
│   │   ├── enrichment.service.ts      # Contact finding waterfall (ContactCompass, Hunter, Apollo, ContactOut)
│   │   ├── intelligence.service.ts    # OpenRouter LLM buyer intelligence synthesis
│   │   ├── punchy-title.service.ts    # Fast headline generator for leads
│   │   ├── setting.service.ts         # Runtime settings CRUD & caching
│   │   ├── whatsapp.service.ts        # Baileys WhatsApp bot alert dispatcher
│   │   ├── payment.service.ts         # Razorpay checkout, verification & credit account crediting
│   │   ├── email.service.ts           # Resend email service for transactional emails
│   │   ├── keep-alive.service.ts      # Cloud ping heartbeat logic
│   │   └── crm.service.ts             # Lead status pipeline updates
│   ├── utils/                         # Helper utilities
│   │   ├── automation-settings.utils.ts# Checks auto-scrape, auto-enrichment toggles
│   │   ├── quiet-hours.utils.ts       # Validates quiet hours window (7 PM - 10 AM IST)
│   │   └── deduplication.utils.ts     # URL normalization & content hashing
│   └── workers/                       # BullMQ async background workers
│       ├── scraperWorker.ts           # Executes scraping jobs via active engines
│       ├── ocrWorker.ts               # Executes OCR text extraction & qualification
│       ├── enrichmentWorker.ts        # Runs contact discovery waterfall
│       ├── titlingWorker.ts           # Generates punchy headlines via LLM
│       └── intelligenceWorker.ts      # Generates full buyer intelligence via OpenRouter LLM
```

---

## 3. Frontend Web Application (`frontend/apps/web/`)
**Runtime:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion.  
**Port:** `3000`  
**Authentication:** Firebase Auth / Supabase Phone OTP + Backend JWT.

### Directory & File Map
```
frontend/apps/web/
├── prisma/
│   ├── schema.prisma                  # Frontend PostgreSQL schema (mirrors backend)
│   └── seed.ts                        # Frontend development seeder
├── public/                            # Static assets, logos, videos, tutorial mp4s
├── src/
│   ├── middleware.ts                  # Next.js route protection middleware
│   ├── app/
│   │   ├── layout.tsx                 # Root layout (fonts, Lenis smooth scroll, meta)
│   │   ├── globals.css                # Global styles & Tailwind utilities
│   │   ├── (public)/                  # Public / marketing routes
│   │   │   ├── page.tsx               # Main landing page (guarded by launch preview)
│   │   │   ├── ComingSoon.tsx         # Launch gate view when COMING_SOON = true
│   │   │   ├── pricing/page.tsx       # Pricing tiers (Free, Freelancer Pro, Top-ups)
│   │   │   ├── login/page.tsx         # User sign-in
│   │   │   ├── register/page.tsx      # Hunter registration
│   │   │   ├── onboarding/page.tsx    # Questionnaire (services, niche, experience)
│   │   │   ├── pending-approval/page.tsx# Waiting screen for pending users
│   │   │   ├── terms/page.tsx         # Terms of Service
│   │   │   └── privacy/page.tsx       # Privacy Policy
│   │   ├── leads/                     # Core hunter lead workspace
│   │   │   ├── page.tsx               # Hunter feed: filters, search, lead cards
│   │   │   └── saved/page.tsx         # Hunter's saved / bookmarked leads
│   │   ├── admin/                     # Full administrative management portal
│   │   │   ├── page.tsx               # Admin overview & stats
│   │   │   ├── leads/page.tsx         # All leads master management
│   │   │   ├── review/page.tsx        # Lead approval queue (Approve / Reject)
│   │   │   ├── tokens/page.tsx        # Scraper engine selector, key pools, failover switch
│   │   │   ├── users/page.tsx         # User status management (ACTIVE / PENDING / REJECTED)
│   │   │   ├── targets/page.tsx       # Source profile watchlist management
│   │   │   ├── keywords/page.tsx      # Monitored keywords management
│   │   │   ├── referrals/page.tsx     # Milestone bounties & proof approvals
│   │   │   └── rbac/page.tsx          # Role & permission assignments
│   │   └── api/                       # Next.js Route Handlers (BFF pattern)
│   │       ├── auth/                  # Session verification & Firebase token sync
│   │       ├── leads/                 # Proxies leads feed & unlocks to backend
│   │       ├── payments/              # Razorpay order generation & verification
│   │       ├── admin/                 # Proxies administrative actions
│   │       └── webhooks/              # Inbound payment & service webhooks
│   ├── components/
│   │   ├── leads/
│   │   │   ├── LeadCard.tsx           # Lead card in the feed with niche & intent tags
│   │   │   ├── LeadDrawer.tsx         # Slide-out drawer with full LLM intelligence & unlock button
│   │   │   ├── RevealConfirmModal.tsx # Dynamic credit cost confirmation dialog
│   │   │   └── LeadFilters.tsx        # Filter bar (platform, niche, freshness, has contact)
│   │   ├── admin/
│   │   │   ├── ScraperEngineFlip.tsx  # 1-click scraper engine switch banner
│   │   │   ├── HunterCrawlerStatus.tsx# Crawler health & session pool status
│   │   │   └── ProofReviewModal.tsx   # Milestone bounty screenshot reviewer
│   │   ├── shared/
│   │   │   ├── Navbar.tsx             # Main header with credit balance pill
│   │   │   ├── Sidebar.tsx            # Hunter navigation menu
│   │   │   └── UpgradeNudgePopup.tsx  # Low-credits upsell modal
│   │   └── ui/                        # Design system primitives (buttons, badges, inputs)
│   └── lib/
│       ├── coins.ts                   # Dynamic reveal cost calculations (15/12/10/5 credits)
│       ├── launch.ts                  # COMING_SOON launch gate & ?preview=1 resolver
│       ├── external-api/client.ts     # Authenticated proxy client to Backend API (:5001)
│       ├── services/                  # Frontend data services
│       │   ├── leads.ts               # Lead fetching, filtering, and caching
│       │   ├── payment.ts             # Razorpay frontend SDK initializer
│       │   ├── rollover.ts            # Credit rollover calculation (15-day expiry)
│       │   └── referral.ts            # Viral bounty proof submissions
│       └── types/                     # Shared TypeScript interfaces for UI models
```

---

## 4. AI Classification & OCR Service (`ai/`)
**Runtime:** Python 3.10+, FastAPI, Uvicorn, scikit-learn, SentenceTransformers.  
**Port:** `8000`

### Directory & File Map
```
ai/
├── main.py                            # FastAPI application router & OCR endpoint
├── server.py                          # Uvicorn entry point (runs on :8000)
├── classifier.py                      # Text relevancy classifier (LogisticRegression + MiniLM)
├── train.py                           # Training pipeline with holdout validation & auto-rollback
├── requirements.txt                   # Python dependencies (fastapi, scikit-learn, uvicorn)
├── lead_model.joblib                  # Active trained classification model
└── lead_model_backup.joblib           # Previous safe model fallback
```

---

## 5. End-to-End Lead Pipeline Architecture

```
[1. Ingestion] ──────► [2. Gate & Dedup] ──────► [3. AI Qualification]
 (Apify / Crawler /      (48h age limit,            (Hard rules +
  Scrapedog / Watchlist)  <100 comments, dedup)      Python ML classifier)
                                                            │
                                                    (If Qualified)
                                                            ▼
[6. Hunter Feed] ◄──── [5. Titling & Intel] ◄──── [4. Contact Enrichment]
 (LeadCard + Drawer     (Headline generator +      (Waterfall: ContactCompass,
  with Dynamic Unlock)   OpenRouter LLM intel)      Hunter, Apollo, ContactOut)
```

### Dynamic Credit Pricing Model (`coins.ts`)
| Data Available Upon Reveal | Unlock Cost |
| :--- | :--- |
| **Phone + Email** | `15 credits` |
| **Phone only** | `12 credits` |
| **Email only** | `10 credits` |
| **Profile Link only** | `5 credits` |
| *(Admin custom cost override)* | Takes precedence if set |

---

## 6. Key Configuration & Environment Variables

| Variable | Service | Purpose |
| :--- | :--- | :--- |
| `DB_MODE` | Backend | `supabase` (PostgreSQL) or `local` (SQLite). |
| `DATABASE_URL` / `DIRECT_URL` | Backend / Frontend | Supabase PostgreSQL connection pooler and direct URLs. |
| `REDIS_URL` | Backend | Redis instance for BullMQ background queues. |
| `PRIMARY_SCRAPER_ENGINE` | Backend | Active scraper: `apify`, `scrapedog`, `crawlbase`, `hunter_crawler`. |
| `HUNTER_CRAWLER_PROXY_URL` | Backend | Sticky residential proxy gateway (Webshare). |
| `OPEN_ROUTER_API` | Backend | OpenRouter API key for LLM intelligence (`gemini-2.0-flash`). |
| `RAZORPAY_KEY_ID` / `_SECRET` | Backend / Frontend | Payment gateway credentials for credit packs and plans. |
| `RESEND_API_KEY` | Backend | Transactional email delivery service. |
| `REQUIRE_SIGNUP_APPROVAL` | Backend / Frontend | When `true`, new signups must be approved in `/admin/users`. |

---

## 7. Developer Quick Reference Commands

```bash
# Start all 4 services concurrently (Redis, Backend, Frontend, AI):
npm run dev

# Run individual services:
cd backend  && npm run dev             # Backend API on http://localhost:5001
cd frontend && npm run dev -w apps/web # Frontend on http://localhost:3000
cd ai       && python server.py        # AI Microservice on http://localhost:8000

# HunterCrawler CLI & Testing:
cd backend
npm run login:local                    # Interactive stealth login for burner LinkedIn accounts
npm run scrape:local                   # Crawl watchlist comments for buyer posts

# Database & Schema:
cd backend
npm run db:push:supabase               # Push schema changes to Supabase PostgreSQL
npm run db:push:local                  # Push schema changes to local SQLite
npm run seed:claimable                 # Seed claimable leads for testing
```

> ⚠️ **Non-Negotiable Rule:** NEVER stage, add (`git add`), or commit any `.env` or `.env.example` files under any circumstances.
