# HunterCrawler — Multi-Account Rotator Pool Specification

> **Engine Name:** HunterCrawler  
> **Type:** Reverse Intent / Piggyback Comment Crawler  
> **Status:** Specification Marked & Production Roadmap  
> **Target Profiles:** 35 Watchlist Creators & Agency Founders (`source_profiles`)

---

## 1. Executive Summary

**HunterCrawler** is Lead Hunter's proprietary stealth crawler designed to capture high-intent B2B buyer posts before competitors do. 

Instead of searching public keywords blindly, HunterCrawler monitors the public discussion feeds of 35 curated agency founders, SDRs, and creators (`source_profiles`). When these targets leave a comment pitching their services on a prospective client's post, HunterCrawler extracts the **parent post** (the actual buyer requesting web dev, design, SEO, automation, or software), parses their direct profile permalink, and routes the lead into the AI qualification pipeline.

---

## 2. The Multi-Account Rotator Pool Architecture

To ensure zero account checkpoints and bypass LinkedIn's velocity blocks on live servers, HunterCrawler utilizes a **5-Account Burner Rotator Pool**.

```
┌────────────────────────────────────────────────────────┐
│               Admin Control Portal                     │
│         (/admin/tokens -> HunterCrawler)               │
└──────────────────────────┬─────────────────────────────┘
                           │ Syncs Sessions
                           ▼
┌────────────────────────────────────────────────────────┐
│             Database Account Pool (`settings`)         │
│  - Account 1 (Active, 7/7 used today)                  │
│  - Account 2 (Active, 0/7 used today)                  │
│  - Account 3 (Active, 0/7 used today)                  │
│  - Account 4 (Cooldown, 24h timer)                     │
│  - Account 5 (Standby / Spare)                         │
└──────────────────────────┬─────────────────────────────┘
                           │ Selects next active account
                           ▼
┌────────────────────────────────────────────────────────┐
│       HunterCrawler Headless Worker (Ubuntu / PM2)     │
│  - Injects cookies into Playwright stealth context     │
│  - Routes via Webshare Sticky Residential Proxy        │
│  - Scrapes 7 watchlist targets per account batch       │
│  - Auto-swaps account if checkpoint/999 detected       │
└────────────────────────────────────────────────────────┘
```

---

## 3. Account Pool Data Model

Stored dynamically in the `settings` table under key `linkedin_account_pool` (or a dedicated `linkedin_accounts` table):

```json
[
  {
    "id": "acc_burner_01",
    "label": "Burner #1 (Alex)",
    "status": "ACTIVE",
    "requests_today": 7,
    "max_daily_requests": 15,
    "last_scraped_at": "2026-11-06T11:44:00.000Z",
    "cooldown_until": null,
    "cookies": [ ... ]
  },
  {
    "id": "acc_burner_02",
    "label": "Burner #2 (Sam)",
    "status": "ACTIVE",
    "requests_today": 0,
    "max_daily_requests": 15,
    "last_scraped_at": "2026-11-06T09:00:00.000Z",
    "cooldown_until": null,
    "cookies": [ ... ]
  },
  {
    "id": "acc_burner_03",
    "label": "Burner #3 (David)",
    "status": "FLAGGED",
    "requests_today": 2,
    "max_daily_requests": 15,
    "last_scraped_at": "2026-11-05T18:00:00.000Z",
    "cooldown_until": "2026-11-07T18:00:00.000Z",
    "error_message": "Checkpoint detected (Persona/Selfie required)",
    "cookies": [ ... ]
  }
]
```

### Account Lifecycle States:
- **`ACTIVE`:** Valid session cookies, ready to be selected for scraping.
- **`COOLDOWN`:** Reached daily quota (e.g. 15 profiles) or hit temporary rate limit. Automatically resets after 12–24 hours.
- **`FLAGGED`:** Encountered security checkpoint, authwall, or revoked cookies. Requires admin action or cookie re-login.

---

## 4. Crawling & Auto-Failover Logic

1. **Target Slicing:** The 35 watchlist profiles are split into small batches of **7 profiles per account run**.
2. **Account Selection:** HunterCrawler selects the `ACTIVE` account with the lowest `requests_today` and oldest `last_scraped_at`.
3. **Sticky Residential Proxy Routing:** Binds Webshare residential proxy to `-session-<account_id>` (e.g. `-session-burner01`) so each account maintains a consistent, steady IP for its entire session.
4. **Stealth Context:** Strips `navigator.webdriver`, spoofs Chrome runtime and plugins, emulates natural human reading delays (8–15s jittered).
5. **Failover Circuit Breaker:**
   - If Account #1 hits a checkpoint / 403 / 999:
     - Mark Account #1 as `FLAGGED`.
     - Log instant alert: `⚠️ Account #1 flagged. Hot-swapping to Account #2...`
     - Spawn new browser context with Account #2's session without terminating the crawl.

---

## 5. Local Authentication & Cloud Sync Commands

```bash
# Authenticate individual burner accounts locally
npm run login:local -- --account=1
npm run login:local -- --account=2
npm run login:local -- --account=3

# Automatically syncs authenticated cookies to the production database via API
# Runs headless multi-account scraping
npm run scrape:local
```

---

## 6. Gating & Freshness Pipeline

Before any buyer opportunity is saved into `lead_posts`, it must satisfy:
1. **4-Day Age Gate:** `isWithinDays(timeStr, 4)` disallows posts older than 4 days.
2. **Oversaturation Gate:** Discards posts with `> 100` comments.
3. **4-Point Deduplication:** Validates across post ID, direct permalink URL, author profile URL, and content similarity hash.
