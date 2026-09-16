import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { oracleDb } from '@/lib/oracle-db'
import { getPlanCredits } from '@/lib/config/plans'
import { creditService } from '@/lib/services/credits'
import { emailService } from '@/lib/services/email'

export const dynamic = 'force-dynamic'

/**
 * Daily Maintenance & Subscription Governance Cron:
 * 1. Downgrades expired paid subscriptions back to FREE starter tier.
 * 2. Refreshes monthly starter credits (50 credits) for FREE tier members whose month ended.
 * 3. Purges unclaimed leads older than 10 days from active discovery while safeguarding claimed leads.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Optional secret check if CRON_SECRET is configured in environment
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const apiKey = request.nextUrl.searchParams.get('key')
      if (apiKey !== cronSecret) {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Invalid cron authorization' }, { status: 401 })
      }
    }

    const now = new Date()
    let downgradedCount = 0
    let freeRefreshedCount = 0

    // 1. Scan for paid users whose subscription has expired without renewal
    const expiredPaidAccounts = await db.creditAccount.findMany({
      where: {
        renewalDate: { lte: now },
        user: {
          plan: { not: 'FREE' },
        },
      },
      include: {
        user: { select: { id: true, plan: true, razorpayCurrentPeriodEnd: true } },
      },
    })

    const freeLimit = getPlanCredits('FREE')

    for (const account of expiredPaidAccounts) {
      // Check if user has an active renewed period in razorpayCurrentPeriodEnd
      const hasPaidRenewal =
        account.user.razorpayCurrentPeriodEnd && account.user.razorpayCurrentPeriodEnd > now

      if (!hasPaidRenewal) {
        const nextRenewal = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        await db.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: account.userId },
            data: { plan: 'FREE' },
          })

          await tx.creditAccount.update({
            where: { userId: account.userId },
            data: {
              subscriptionBalance: freeLimit,
              renewalDate: nextRenewal,
              rolloverBalance: 0,
              rolloverExpiresAt: null,
            },
          })

          await tx.auditLog.create({
            data: {
              userId: account.userId,
              adminId: 'system_cron',
              action: 'PLAN_DOWNGRADED',
              targetType: 'USER',
              targetId: account.userId,
              details: {
                previousPlan: account.user.plan,
                newPlan: 'FREE',
                reason: 'subscription_expired_daily_cron',
                subscriptionCredits: freeLimit,
                renewalDate: nextRenewal.toISOString(),
              },
            },
          })
        })

        downgradedCount++
      }
    }

    // 2. Scan for free tier users whose month has completed to refresh their 50 starter credits
    const expiredFreeAccounts = await db.creditAccount.findMany({
      where: {
        renewalDate: { lte: now },
        user: {
          plan: 'FREE',
        },
      },
      select: {
        userId: true,
      },
    })

    for (const freeAcc of expiredFreeAccounts) {
      // Trigger just-in-time refresh via creditService
      await creditService.getBalances(freeAcc.userId).catch((err) => {
        console.warn('[Cron] Free credit refresh failed for user:', freeAcc.userId, err)
      })
      freeRefreshedCount++
    }

    // 3. Scan for active paid subscriptions renewing in the next 3 days to send Renewal Notice (Flow 4)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    let renewalNoticesSent = 0

    const upcomingRenewals = await db.creditAccount.findMany({
      where: {
        renewalDate: { gte: now, lte: threeDaysFromNow },
        user: { plan: { not: 'FREE' } },
      },
      include: {
        user: { select: { id: true, name: true, email: true, plan: true } },
      },
    })

    for (const item of upcomingRenewals) {
      if (item.user?.email && item.renewalDate) {
        const recentReminder = await db.emailLog.findFirst({
          where: {
            to: item.user.email,
            type: 'renewal_reminder',
            sentAt: { gte: sevenDaysAgo },
          },
        })

        if (!recentReminder) {
          const daysRemaining = Math.max(
            1,
            Math.ceil((item.renewalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
          )
          const formattedDate = item.renewalDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
          await emailService
            .sendRenewalNotice(
              { name: item.user.name || '', email: item.user.email },
              daysRemaining,
              item.user.plan,
              formattedDate,
            )
            .catch((err) => console.warn('[Cron] Renewal notice failed:', err))
          renewalNoticesSent++
        }
      }
    }

    // 4. Purge unclaimed leads older than 10 days from active discovery feed
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    let purgedUnclaimedCount = 0
    let preservedClaimedCount = 0

    try {
      const candidates = await oracleDb.leadPost.findMany({
        where: {
          created_at: { lt: tenDaysAgo },
          is_deleted: false,
        },
        select: { id: true },
      })

      if (candidates.length > 0) {
        const candidateIds = candidates.map((c) => c.id)

        const claimedStates = await db.userLeadState.findMany({
          where: {
            leadId: { in: candidateIds },
            OR: [{ isSaved: true }, { isRevealed: true }, { status: { not: 'new' } }],
          },
          select: { leadId: true },
        })

        const claimedSet = new Set(claimedStates.map((s) => s.leadId))
        const safePurgeIds = candidateIds.filter((id) => !claimedSet.has(id))

        if (safePurgeIds.length > 0) {
          await oracleDb.leadPost.updateMany({
            where: { id: { in: safePurgeIds } },
            data: { is_deleted: true },
          })
          purgedUnclaimedCount = safePurgeIds.length
        }
        preservedClaimedCount = claimedSet.size
      }
    } catch (purgeErr) {
      console.warn('[Cron] Lead purge non-critical error:', purgeErr)
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: {
        downgradedExpiredPaidAccounts: downgradedCount,
        refreshedFreeStarterAccounts: freeRefreshedCount,
        upcomingRenewalNoticesSent: renewalNoticesSent,
        purgedUnclaimedLeadsOlderThan10Days: purgedUnclaimedCount,
        permanentlyPreservedClaimedLeads: preservedClaimedCount,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Cron maintenance task failed'
    console.error('[Cron Maintenance] Error:', error)
    return NextResponse.json({ code: 'CRON_ERROR', message: msg }, { status: 500 })
  }
}
