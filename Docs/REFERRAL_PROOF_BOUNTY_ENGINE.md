# Phase 5: Referral Proof & Milestone Bounty Engine

**Status:** Parked (Architecture & Specification Ready)  
**Target Milestone:** Phase 5  

---

## 1. Overview & Objective
Enable viral growth through a high-incentive referral and milestone reward system. 
Users share referral codes, and when they or their referred peers hit real-world outreach milestones, they upload screenshot proof to earn platform credits.

### The 3 Core Milestones
1. **Positive Reply Proof (`POSITIVE_REPLY`)**
   * *Trigger:* Prospect responds with genuine interest (e.g., asking for portfolio, pricing, or discovery call).
   * *Default Reward:* Configurable (e.g. +10 credits).
2. **Meeting Scheduled Proof (`MEETING_SCHEDULED`)**
   * *Trigger:* Prospect schedules a call (Google Meet invite, Zoom link, Calendly confirmation).
   * *Default Reward:* Configurable (e.g. +25 credits).
3. **Deal Closed Proof (`DEAL_CLOSED`)**
   * *Trigger:* Contract signed, onboarding initiated, or initial invoice/payment confirmed.
   * *Default Reward:* Configurable (e.g. +50–100 credits).

---

## 2. User Experience (`/rewards` or `/referrals`)
* **Referral Link & Stats Widget:**
  * Displays unique link: `https://leadhunter.club/register?ref=USER_CODE`
  * Displays total friends invited, successful signups, and total bounty credits earned.
* **Milestone Proof Submission Cards:**
  * 3 dedicated cards (Positive Reply, Meeting Scheduled, Client Closed).
  * Drag-and-drop screenshot uploader (PNG, JPG, WebP) with client name/domain input.
  * Real-time status badges: `Under Review`, `Approved (+X credits)`, or `Rejected`.

---

## 3. Admin Control Experience (`/admin/rewards`)
* **Milestone Credit Settings:**
  * Input fields for admins to dynamically set and adjust credit rewards for each of the 3 milestones.
* **Verification & Dispensing Queue:**
  * Filterable table of submitted proofs (`PENDING`, `APPROVED`, `REJECTED`).
  * Screenshot thumbnail with full-size lightbox preview.
  * User & Referrer details.
  * **AI Verification Score & Key Evidence Summary**.
  * Action buttons:
    * **Approve & Dispense Credits** (instantly credits user account and logs audit transaction).
    * **Reject with Reason** (sends feedback notice to user).

---

## 4. Screenshot Authenticity & Verification Engine

### Layer 1: Multimodal AI Vision Analysis (Gemini 1.5 Flash / GPT-4o)
On upload, backend invokes the AI Vision API with a strict verification prompt:
* **Context Recognition:** Validates interface authenticity (Gmail, Outlook, LinkedIn, Upwork, Slack, WhatsApp).
* **Intent Analysis:** Confirms positive sentiment, meeting dates, or contractual agreements.
* **Structured Output:**
  ```json
  {
    "isValid": true,
    "detectedMilestone": "MEETING_SCHEDULED",
    "confidenceScore": 94,
    "evidenceSnippet": "Google Meet invite confirmed for Thursday at 3:00 PM EST with client",
    "suspiciousFlags": []
  }
  ```

### Layer 2: Fraud & Duplicate Fingerprinting
* **Perceptual Image Hash (`pHash`):** Computes image fingerprint upon upload. If another user submits the same screenshot or a cropped version, it is flagged as `DUPLICATE_PROOF` immediately.
* **Lead Matching:** Cross-references the client/company name against the user's claimed/revealed leads on Lead Hunter.

### Layer 3: AI-Assisted 1-Click Approval
* Submissions are prioritized in the admin queue by confidence score.
* High confidence (90%+) displays a green check for 1-click dispensing.
* Flagged submissions alert the admin to review manually before dispensing credits.

---

## 5. Database Schema Blueprint

```prisma
model Referral {
  id             String    @id @default(uuid())
  referrerId     String
  referredUserId String    @unique
  code           String
  createdAt      DateTime  @default(now())

  referrer       User      @relation("ReferralsGiven", fields: [referrerId], references: [id])
  referredUser   User      @relation("ReferralReceived", fields: [referredUserId], references: [id])
}

enum MilestoneType {
  POSITIVE_REPLY
  MEETING_SCHEDULED
  DEAL_CLOSED
}

enum ProofStatus {
  PENDING
  APPROVED
  REJECTED
}

model MilestoneProofSubmission {
  id               String        @id @default(uuid())
  userId           String
  milestoneType    MilestoneType
  screenshotUrl    String
  imageHash        String?
  aiScore          Int?
  aiSummary        String?
  status           ProofStatus   @default(PENDING)
  rejectionReason  String?
  creditsAwarded   Int           @default(0)
  reviewedByAdminId String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  user             User          @relation(fields: [userId], references: [id])
}

model MilestoneRewardConfig {
  id               String        @id @default(uuid())
  milestoneType    MilestoneType @unique
  creditsReward    Int           @default(10)
  updatedAt        DateTime      @updatedAt
}
```

---

## 6. Execution Roadmap (When Resumed)
1. **DB Migration:** Add `Referral`, `MilestoneProofSubmission`, and `MilestoneRewardConfig` models to Prisma schema.
2. **Storage:** Configure S3/Supabase Storage bucket for proof uploads (`proof-screenshots`).
3. **AI Vision Service:** Build `proof-verifier.service.ts` using Gemini 1.5 Flash.
4. **User UI:** Create `/rewards` page with referral code card and upload modules.
5. **Admin UI:** Create `/admin/rewards` with credit configuration inputs and approval table.
6. **Notification:** Add notification/email dispatch when credits are approved and dispensed.
