import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireAuth,
  AuthRequiredError,
  ForbiddenError,
  InactiveUserError,
  EmailNotVerifiedError,
  OnboardingRequiredError,
  PendingApprovalError,
} from '@/lib/auth'
import { creditService } from '@/lib/services/credits'
import { getPlanCredits } from '@/lib/config/plans'

export const dynamic = 'force-dynamic'

const VALID_VARIANTS = ['upgrade', 'renewal', 'low-credits', 'out-of-credits']

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request)
    const userId = authUser.uid

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { creditAccount: true },
    })

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ show: false, message: 'User not active or eligible' }, { status: 200 })
    }

    // Check which popups have already been shown and dismissed by this user
    const dismissedLogs = await db.auditLog.findMany({
      where: {
        userId,
        action: 'POPUP_DISMISSED',
        targetType: 'POPUP_NUDGE',
      },
      select: { targetId: true },
    })
    const dismissedVariants = new Set(dismissedLogs.map((l) => l.targetId))

    let balance = { total: 0, subscription: 0, bonus: 0, rollover: 0 }
    try {
      balance = await creditService.getBalances(userId)
    } catch (e) {
      console.error('[Popup Status API] Error getting balance, falling back to creditAccount:', e)
      const sub = user.creditAccount?.subscriptionBalance ?? 0
      const bonus = user.creditAccount?.bonusBalance ?? 0
      balance = { total: sub + bonus, subscription: sub, bonus, rollover: 0 }
    }

    const plan = user.plan?.toUpperCase() || 'FREE'
    const planMax = getPlanCredits(plan)
    const renewalDate = user.creditAccount?.renewalDate || user.razorpayCurrentPeriodEnd

    // 1. OUT OF CREDITS (Highest priority: total credits === 0)
    if (balance.total === 0 && !dismissedVariants.has('out-of-credits')) {
      return NextResponse.json({
        show: true,
        variant: 'out-of-credits',
        plan,
        creditsRemaining: 0,
        planMax,
      })
    }

    // 2. LOW CREDITS (1 or 2 credits left)
    if (balance.total > 0 && balance.total <= 2 && !dismissedVariants.has('low-credits')) {
      return NextResponse.json({
        show: true,
        variant: 'low-credits',
        plan,
        creditsRemaining: balance.total,
        planMax,
      })
    }

    // 3. PLAN RENEWAL (Within 3 days of renewal date for paid plans)
    if (plan !== 'FREE' && renewalDate && !dismissedVariants.has('renewal')) {
      const now = Date.now()
      const renTime = new Date(renewalDate).getTime()
      const daysUntilRenewal = (renTime - now) / (1000 * 60 * 60 * 24)
      if (daysUntilRenewal <= 3 && daysUntilRenewal >= -1) {
        return NextResponse.json({
          show: true,
          variant: 'renewal',
          plan,
          creditsRemaining: balance.total,
          planMax,
          renewalDate: new Date(renewalDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        })
      }
    }

    // 4. UPGRADE (Free user upsell nudge)
    if (plan === 'FREE' && !dismissedVariants.has('upgrade')) {
      return NextResponse.json({
        show: true,
        variant: 'upgrade',
        plan: 'FREE',
        creditsRemaining: balance.total,
        planMax,
      })
    }

    return NextResponse.json({ show: false })
  } catch (error: unknown) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof ForbiddenError ||
      error instanceof InactiveUserError ||
      error instanceof EmailNotVerifiedError ||
      error instanceof OnboardingRequiredError ||
      error instanceof PendingApprovalError
    ) {
      return NextResponse.json({ show: false, message: 'User not active or unverified' }, { status: 200 })
    }
    console.error('[Popup Status API] Error:', error)
    return NextResponse.json({ show: false, message: 'Error checking popup status' }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request)
    const userId = authUser.uid

    const body = await request.json().catch(() => ({}))
    const variant = String(body.variant || '')

    if (!VALID_VARIANTS.includes(variant)) {
      return NextResponse.json({ success: false, message: 'Invalid variant' }, { status: 400 })
    }

    // Idempotent audit log creation: record dismissal so popup is shown only once per user
    const existing = await db.auditLog.findFirst({
      where: {
        userId,
        action: 'POPUP_DISMISSED',
        targetType: 'POPUP_NUDGE',
        targetId: variant,
      },
    })

    if (!existing) {
      await db.auditLog.create({
        data: {
          userId,
          adminId: 'system',
          action: 'POPUP_DISMISSED',
          targetType: 'POPUP_NUDGE',
          targetId: variant,
          details: {
            dismissedAt: new Date().toISOString(),
          },
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof ForbiddenError ||
      error instanceof InactiveUserError ||
      error instanceof EmailNotVerifiedError ||
      error instanceof OnboardingRequiredError ||
      error instanceof PendingApprovalError
    ) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 200 })
    }
    console.error('[Popup Status Dismiss API] Error:', error)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 200 })
  }
}
