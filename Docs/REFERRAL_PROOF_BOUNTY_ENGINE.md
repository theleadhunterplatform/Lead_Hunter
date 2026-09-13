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

// ── In-App Popup & Dashboard Announcements ─────────────────────────
enum PopupTriggerType {
  UPGRADE_PROMPT     // Free to Paid upsell
  CREDIT_RENEWAL     // Upcoming or completed monthly token refill
  LOW_CREDITS        // Credits <= 2 alert
  ADMIN_BROADCAST    // Global or segmented admin announcement
}

model PopupNotification {
  id               String            @id @default(uuid())
  triggerType      PopupTriggerType
  title            String
  body             String
  badgeText        String?           // e.g. "Limited Offer", "Renewal"
  ctaText          String            // e.g. "Upgrade to Pro", "Refill Tokens"
  ctaUrl           String            // e.g. "/pricing", "/refill"
  secondaryText    String?           // e.g. "Maybe later"
  targetPlan       String?           // e.g. "free", "all"
  isActive         Boolean           @default(true)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  receipts         UserPopupReceipt[]
}

model UserPopupReceipt {
  id               String            @id @default(uuid())
  userId           String
  popupId          String
  seenAt           DateTime          @default(now())
  dismissedAt      DateTime?
  actionTaken      Boolean           @default(false)

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  popup            PopupNotification @relation(fields: [popupId], references: [id], onDelete: Cascade)

  @@unique([userId, popupId])
}
```

---

## 7. In-App Targeted Dashboard Popup Engine

### Core Goal
Deliver high-conversion, contextual modal alerts on the user's dashboard (Upgrade Free to Paid, Credit Renewal, Low Credits Remaining, or Admin Broadcast) with a strict **"Show Exactly Once Per User"** guarantee.

### Delivery Lifecycle
1. **Real-time Push for Active Users:**
   * When an announcement or trigger is created, active dashboard sessions receive a WebSocket / SSE / liveness poll event and trigger the modal immediately on screen without a reload.
2. **Persistent Queue for Inactive Users:**
   * Inactive users retain an unread popup record in the database. When they log in and open `/dashboard` at any point in the future, the dashboard fetches `GET /api/notifications/active-popups` on mount and displays it.
3. **Single-View Guarantee (Database Receipts):**
   * As soon as the modal is displayed or dismissed, the frontend sends `POST /api/notifications/dismiss { popupId }`.
   * A unique `UserPopupReceipt` record is created. Subsequent visits will never re-show that specific popup to that user.

### Trigger Matrix
| Trigger Type | Condition | Target Audience | Modal Message / CTA |
|--------------|-----------|-----------------|----------------------|
| **`UPGRADE_PROMPT`** | User on Free plan after 3 days or 5 lead previews | `plan: "free"` | "Unlock Direct Phone Numbers & 50 Tokens/Month" $\rightarrow$ `/pricing` |
| **`LOW_CREDITS`** | User balance $\le 2$ credits after lead reveal | Any plan | "You're down to 2 credits. Refill now so you don't miss new leads" $\rightarrow$ `/refill` |
| **`CREDIT_RENEWAL`** | Monthly billing renewal completed or 3 days prior | Paid plans | "Your monthly credits have renewed! Ready to hunt?" $\rightarrow$ `/leads` |
| **`ADMIN_BROADCAST`** | Admin writes a global announcement modal | Configurable | Custom title, message, badge, and target CTA button |

---

## 8. Execution Roadmap (When Resumed)
1. **DB Schema:** Add `Referral`, `MilestoneProofSubmission`, `MilestoneRewardConfig`, `PopupNotification`, and `UserPopupReceipt` to Prisma.
2. **Storage:** Set up storage bucket for milestone proof screenshots.
3. **AI Vision Verifier:** Implement Gemini 1.5 Flash multimodal OCR for screenshot validation and confidence scoring.
4. **User UI:**
   * `/rewards`: Referral link generation, referral leaderboard, and proof submission dropzone.
   * `DashboardPopupModal.tsx`: Global overlay component inside dashboard layout responding to active popups.
5. **Admin UI:**
   * `/admin/rewards`: Configure credit bounties + review queue for proof approvals.
   * `/admin/notifications`: Create, schedule, and preview popup broadcast campaigns.
6. **API Endpoints:**
   * `GET /api/notifications/active-popups` & `POST /api/notifications/dismiss`
   * `POST /api/rewards/submit-proof` & `POST /api/admin/rewards/dispense`
