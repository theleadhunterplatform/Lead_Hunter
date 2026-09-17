# Phase 5: Viral Growth, Referral Engine & Automated Email Communications

**Current Status:** In Progress (Part 1 Completed & Live; Parts 2 & 3 Next Up)  
**Target Milestone:** Phase 5  

---

## Executive Summary

Phase 5 encompasses the entire user retention, viral growth, lifecycle communication, and subscription governance system for **Lead Hunter Club**. It is structured into 7 distinct pillars:

1. **Part 1: User Referral & Bonus Credits Engine** *(COMPLETED & LIVE)*
2. **Part 2: SMTP Email Infrastructure & Automated Lifecycle Notifications** *(COMPLETED & LIVE)*
3. **Part 3: Admin Targeted Email Broadcast Center** *(COMPLETED & LIVE)*
4. **Part 4: Newsletter Engine & Public Subscriber Broadcasts** *(COMPLETED & LIVE)*
5. **Part 5: Community Hub (User Wins & Admin Moderated Social Proof)** *(NEXT UP)*
6. **Part 6: Subscription Lifecycle, Anti-Abuse & Claim Governance** *(COMPLETED & LIVE)*
7. **Part 7: Outreach Milestone Proof Engine** *(COMPLETED & LIVE)*

---

## Part 1: User Referral & Bonus Credits Engine ✅ (COMPLETED & LIVE)

* **Referral Link & Code Generator**:
  * Every user receives a unique 8-character code and invite link (`https://leadhunterclub.vercel.app/register?ref=CODE`).
* **Automated Credit Bounty Attribution**:
  * Referrer receives **+10 bonus credits** immediately when an invited friend signs up.
  * Newly registered friend receives **+5 welcome bonus credits**.
  * Fully protected against self-referrals and duplicate claims via database transactions.
* **Dedicated Dashboard (`/referrals`)**:
  * Real-time metrics: Friends Invited, Total Bounty Credits Earned, Available Bonus Balance.
  * 1-click sharing buttons (WhatsApp, LinkedIn, X/Twitter, Email).
  * Chronological activity log showing referred members (with masked emails) and credits granted.
* **Platform Latency & Infrastructure Optimizations**:
  * Vercel compute region migrated to **Mumbai (`bom1`)**, dropping API response latency from 4.1s to sub-100ms.
  * Connection pool reuse in production lambdas.
  * Cleaned up dead and redundant code across the app.

---

## Part 2: Automated Email System (SMTP) ⏳ (READY TO IMPLEMENT)

* **Hybrid SMTP Transporter (`nodemailer`)**:
  * Support standard SMTP credentials configured via environment variables:
    * `SMTP_HOST`: (e.g. `smtp.gmail.com`, `smtp-relay.brevo.com`, or custom domain mail server)
    * `SMTP_PORT`: `587` (TLS) or `465` (SSL)
    * `SMTP_USER`: Email / Username
    * `SMTP_PASS`: App password or SMTP key
    * `EMAIL_FROM`: `Lead Hunter Club <noreply@yourdomain.com>`
  * Fallback to Resend API if SMTP is not provided.
* **Automated Lifecycle Email Flows**:
  1. **Pre-Approval Email (Application Received)**:
     * Sent immediately upon onboarding submission.
     * Informs user their application is under review and sets expectation (24–48h).
  2. **Post-Approval Email (Account Activated)**:
     * Sent instantly when an admin approves the account.
     * Congratulates user, awards initial 50 credits, and guides them on revealing their first leads.
  3. **Milestone / Notification Emails (The Nudge Points)**:
     * **Point A — Low / Out of Credits Alert**: Sent when credit balance hits ≤ 2, nudging them to refill or refer a friend for +10 free credits.
     * **Point B — Plan Renewal & Rollover Warning**: Sent 3–7 days prior to renewal so users don't lose accumulated rollover credits.
     * **Point C — Referral Bonus Credited Notice**: Sent to the referrer whenever a friend joins using their link.

---

## Part 3: Admin Targeted Email Broadcast Center ⏳ (READY TO IMPLEMENT)

* **Dedicated Admin Broadcast UI (`/admin/broadcast`)**:
  * Integrated directly into the existing protected Admin suite.
* **Audience Selector**:
  * 👥 **All Users**: Broadcast to all active verified members.
  * 💎 **Paid Users Only**: Filtered strictly to subscribers (`FREELANCER` and `AGENCY` tiers).
  * 🆓 **Free Users Only**: Filtered to `FREE` starter / non-paying users (for promotional upsells and announcements).
* **Composer & Live Preview**:
  * Subject line and message body editor with rich formatting.
* **Safe Batch Delivery Engine**:
  * Sends in controlled batches (10–20 emails per chunk) to avoid spam filters and timeouts.
  * Real-time progress bar (e.g., *"Sending 45 emails... 45/45 sent"*).
  * Comprehensive logging in `email_logs` table for delivery tracking and bounce analysis.

---

## Part 4: Newsletter Engine & Public Subscriber Broadcasts ⏳ (READY TO IMPLEMENT)

* **Public Subscriber Capture & Double Opt-in**:
  * Embedded landing page capture widget ([`NewsletterSignup.tsx`](file:///d:/work/Clients_work/Lead_Hunter/frontend/apps/web/src/app/components/NewsletterSignup.tsx)).
  * Verification email dispatch with secure tokenized confirmation link (`/newsletter/confirm`).
  * Automated welcome email featuring platform introduction and sample high-intent lead preview.
* **Admin Newsletter Dashboard (`/admin/newsletter`)**:
  * Subscriber management table displaying email, status (`SUBSCRIBED`, `UNSUBSCRIBED`, `BOUNCED`), source channel, and subscription date.
  * Manual subscriber addition and bulk export capability.
* **Automated & Curated Weekly Lead Digest**:
  * Fast digest composer: 1-click pull of the top 5 highest-scoring verified leads of the week into the newsletter body.
  * Formatted with intent badges, estimated project budgets, and direct CTA buttons directing subscribers to sign up / unlock full details.
* **Unified SMTP / Resend Bulk Dispatch Engine**:
  * Connects directly to the Phase 5 hybrid SMTP engine (`nodemailer` with Resend fallback).
  * Controlled batch delivery (10–20 emails per burst) to safeguard domain reputation and avoid rate limits.
  * RFC-compliant headers (`List-Unsubscribe`, `List-Unsubscribe-Post`) for 1-click spam-safe unsubscribes (`/newsletter/unsubscribe?token=...`).
  * Full delivery audit logging in `EmailLog` table.

---

## Part 5: Community Hub (User Wins & Admin Moderated Social Proof) ⏳ (READY TO IMPLEMENT)

* **User Win & Achievement Submission**:
  * Members submit client wins, closed deals, and meeting bookings directly from their dashboard.
  * Submission fields: Achievement title, deal size/details, client niche, and optional testimonial or proof screenshot.
* **Admin Moderation & Approval Queue (`/admin/community`)**:
  * Protects community quality: only genuine, approved achievements go live.
  * Admins review, approve, edit, or reject submissions in 1 click.
* **Public Community Hub (`/community`)**:
  * Dynamic social proof feed visible to all logged-in members and visitors.
  * Filters by win category (e.g., *Deals Closed*, *Meetings Booked*, *Outreach Responses*).
  * Interactive likes/celebrations to foster community engagement.

---

## Part 6: Subscription Lifecycle, Anti-Abuse & Claim Governance ⏳ (READY TO IMPLEMENT)

* **Social Link Deduplication (Anti-Abuse Free Tier Protection)**:
  * Normalizes social profile links submitted during onboarding/registration (strips protocols, query parameters, and trailing slashes).
  * Checks against database: if the social media profile link already exists on another account, block registration to prevent multiple accounts farming free credits.
* **10-Day General Feed Purge with Permanent User Claim Retention**:
  * Automatically clean up or archive unclaimed/general leads older than 10 days from the main discovery feed.
  * **Guaranteed User Access**: Any lead claimed, unlocked, or saved into a user's pipeline remains **permanently saved in their account**, independent of the general feed purge.
* **Claimed Lead Transparency & Contact Lockdown**:
  * When 1 user unlocks/claims a lead, the lead card displays a visible **"Claimed by a member"** badge.
  * **Strict Contact Lockdown**: The client contact details (email, phone, direct profile) are hidden and locked from all other users, preventing duplicate pitches.
* **Subscription Renewal Queuing**:
  * If a subscriber pays for next month with 7 days remaining on their current cycle, the new 30 days are stacked in the queue (`new_expiry = current_expiry + 30 days`), preserving their remaining 7 days.
* **Automated Expiration Downgrade**:
  * Daily background cron checks expired subscriptions. When a plan ends without renewal, automatically downgrade the user back to the `FREE` starter tier.

---

## Part 7: Outreach Milestone Screenshot Proof Engine ✅ (COMPLETED & LIVE)

* **User Proof Submissions (`/rewards`)**:
  * Users upload screenshot evidence of outreach success (Positive Reply, Meeting Scheduled, Deal Closed).
* **Admin Review Queue (`/admin/rewards`)**:
  * Admins manually review submissions with full lightbox screenshot viewing and 1-click credit awarding (+10, +25, +50 credits).


