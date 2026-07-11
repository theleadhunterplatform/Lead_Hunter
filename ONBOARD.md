# User onboard readiness checklist

Use this to take Lead Hunter from “code ready” to “hunters can sign up and claim.”

## What “ready” means

| Mode | Criteria |
|------|----------|
| **Admin-operated beta** | Staff approve users, keep claimable leads stocked, email optional, Billing optional |
| **Self-serve SaaS** | Open or auto-approve signup, live lead supply, email, Razorpay, OpenRouter |

---

## 1. Database schema

From `backend/`:

```bash
# Local SQLite
npm run db:push

# Production Postgres / Supabase
npm run db:push:supabase
```

This applies phone OTP columns, outreach draft fields, and the `Payment` table.

---

## 2. Required production env (API)

Hard-fail if missing:

- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (not defaults)
- `DATABASE_URL`
- `FRONTEND_URL` (exact frontend origin, no trailing slash)
- `SETTINGS_ENCRYPTION_KEY` — `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

Recommended for a usable product:

- `REDIS_URL` (+ `USE_CLOUD_REDIS=true` on Upstash/Render Redis)
- `APIFY_API_TOKEN`
- `OPEN_ROUTER_API` (intelligence + outreach drafts)
- `RESEND_API_KEY` + `EMAIL_FROM` (or SMTP_*) — password reset & CRM send
- `REQUIRE_SIGNUP_APPROVAL=true` (staff approvals) **or** `false` for open beta

Optional:

- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` — enables Billing nav + upgrades
- `GOOGLE_OAUTH_*` — Google Sheets only (warns if missing; API still boots)
- `SUPABASE_JWT_SECRET` + frontend `NEXT_PUBLIC_SUPABASE_*` — phone OTP

---

## 3. Seed claimable leads (demo / empty inventory fix)

```bash
cd backend
npm run seed:claimable
```

Creates approved leads with intelligence so hunters can claim immediately.

To also turn on auto-scrape + auto-enrichment settings:

```bash
# Windows PowerShell
$env:SEED_ENABLE_AUTO_SCRAPE="true"; npm run seed:claimable
```

For continuous supply: Redis up → Search Keys → enable auto-scrape → add keywords/targets → approve in Lead Intelligence.

---

## 4. Frontend env

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-api.example.com/api
# Optional phone OTP
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 5. Admin go-live sequence

1. Deploy API + frontend; confirm `/health`
2. Run `db:push` on the production DB
3. Log in as platform admin → **User Approvals** (if approval is on)
4. Run `seed:claimable` **or** scrape → enrich → approve → intel
5. Register a test hunter → approve → claim → CRM
6. (Optional) Set Resend, Razorpay, Supabase phone, Google Sheets

---

## 6. Product behavior notes

- Billing nav appears only when Razorpay keys are set
- Password reset no longer pretends email was sent when mail is unconfigured
- External users only see `relevant` + `approved` leads; claiming also needs `intelligence`
- Google OAuth is not required to boot production

See also `RENDER-DEMO.md` for a Render-oriented walkthrough.
