import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { getPlanCredits } from '@/lib/config/plans'
import { expireRolloverInTx, rolloverOnRenewal } from '@/lib/services/rollover'

export class InsufficientCreditsError extends Error {
  public required: number
  public available: number

  constructor(required: number, available: number) {
    super(`Insufficient credits. Required: ${required}, Available: ${available}`)
    this.name = 'InsufficientCreditsError'
    this.required = required
    this.available = available
  }
}

function now(): Date {
  return new Date()
}

async function checkAndRenewInTx(tx: Prisma.TransactionClient, userId: string) {
  // Note: FOR UPDATE row locking is not used here as it's incompatible with
  // pgbouncer transaction mode (used in production). Optimistic concurrency is sufficient.

  const account = await tx.creditAccount.findUnique({
    where: { userId },
    include: { user: { select: { plan: true, razorpayCurrentPeriodEnd: true } } },
  })

  if (!account) return null

  await expireRolloverInTx(tx, userId, account)

  if (account.renewalDate && now() >= account.renewalDate) {
    const isFree = account.user.plan === 'FREE'

    // If on a paid plan, check if user has an active renewed period in razorpayCurrentPeriodEnd
    const hasPaidPeriod =
      !isFree &&
      account.user.razorpayCurrentPeriodEnd &&
      account.user.razorpayCurrentPeriodEnd > now()

    if (isFree || hasPaidPeriod) {
      // Normal renewal (free tier monthly credit reset or active paid recurring renewal)
      const limit = getPlanCredits(account.user.plan)
      const rollover = rolloverOnRenewal(account, account.subscriptionBalance)
      const nextRenewal = hasPaidPeriod
        ? account.user.razorpayCurrentPeriodEnd!
        : new Date(now().getTime() + 30 * 24 * 60 * 60 * 1000)

      const renewed = await tx.creditAccount.update({
        where: { userId },
        data: {
          subscriptionBalance: limit,
          renewalDate: nextRenewal,
          rolloverBalance: rollover.rolloverBalance,
          rolloverExpiresAt: rollover.rolloverExpiresAt,
        },
        select: {
          subscriptionBalance: true,
          bonusBalance: true,
          rolloverBalance: true,
          rolloverExpiresAt: true,
          renewalDate: true,
        },
      })

      await tx.auditLog.create({
        data: {
          userId,
          adminId: userId,
          action: 'CREDIT_CHANGE',
          targetType: 'USER',
          targetId: userId,
          details: {
            type: 'renewal',
            previousSubscriptionBalance: account.subscriptionBalance,
            newSubscriptionBalance: limit,
            rolledOver: rollover.rolloverBalance,
            rolloverExpiresAt: rollover.rolloverExpiresAt?.toISOString(),
            reason: isFree ? 'free_tier_monthly_refresh' : 'paid_auto_renewal',
          },
        },
      })

      return renewed
    } else {
      // Auto-downgrade expired paid subscription to FREE starter tier
      const freeLimit = getPlanCredits('FREE')
      const nextRenewal = new Date(now().getTime() + 30 * 24 * 60 * 60 * 1000)

      await tx.user.update({
        where: { id: userId },
        data: { plan: 'FREE' },
      })

      const downgraded = await tx.creditAccount.update({
        where: { userId },
        data: {
          subscriptionBalance: freeLimit,
          renewalDate: nextRenewal,
          rolloverBalance: 0,
          rolloverExpiresAt: null,
        },
        select: {
          subscriptionBalance: true,
          bonusBalance: true,
          rolloverBalance: true,
          rolloverExpiresAt: true,
          renewalDate: true,
        },
      })

      await tx.auditLog.create({
        data: {
          userId,
          adminId: userId,
          action: 'PLAN_DOWNGRADED',
          targetType: 'USER',
          targetId: userId,
          details: {
            previousPlan: account.user.plan,
            newPlan: 'FREE',
            reason: 'subscription_expired',
            subscriptionCredits: freeLimit,
            renewalDate: nextRenewal.toISOString(),
          },
        },
      })

      return downgraded
    }
  }

  return account
}

async function deductInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>,
) {
  await checkAndRenewInTx(tx, userId)

  const account = await tx.creditAccount.findUnique({
    where: { userId },
  })

  if (!account) throw new Error('CreditAccount not found')

  const totalAvailable = account.bonusBalance + account.subscriptionBalance + account.rolloverBalance
  if (totalAvailable < amount) throw new InsufficientCreditsError(amount, totalAvailable)

  let remaining = amount
  const rolloverDeduction = Math.min(account.rolloverBalance, remaining)
  remaining -= rolloverDeduction
  const subscriptionDeduction = Math.min(account.subscriptionBalance, remaining)
  remaining -= subscriptionDeduction
  const bonusDeduction = remaining

  const data: Prisma.CreditAccountUpdateInput = {
    rolloverBalance: { decrement: rolloverDeduction },
    subscriptionBalance: { decrement: subscriptionDeduction },
    bonusBalance: { decrement: bonusDeduction },
  }

  if (rolloverDeduction > 0 && account.rolloverBalance - rolloverDeduction === 0) {
    data.rolloverExpiresAt = null
  }

  // Atomic conditional update: Guarantees balance cannot be decremented below available amounts
  const updateResult = await tx.creditAccount.updateMany({
    where: {
      userId,
      rolloverBalance: { gte: rolloverDeduction },
      subscriptionBalance: { gte: subscriptionDeduction },
      bonusBalance: { gte: bonusDeduction },
    },
    data,
  })

  if (updateResult.count === 0) {
    throw new InsufficientCreditsError(amount, 0)
  }

  const updated = await tx.creditAccount.findUniqueOrThrow({
    where: { userId },
    select: {
      subscriptionBalance: true,
      bonusBalance: true,
      rolloverBalance: true,
      rolloverExpiresAt: true,
      renewalDate: true,
    },
  })

  const actingAdminId = (metadata?.adminId as string) ?? userId

  await tx.auditLog.create({
    data: {
      userId,
      adminId: actingAdminId,
      action: 'CREDIT_CHANGE',
      targetType: 'USER',
      targetId: userId,
      details: {
        type: 'deduct',
        amount,
        rolloverUsed: rolloverDeduction,
        subscriptionUsed: subscriptionDeduction,
        bonusUsed: bonusDeduction,
        reason,
        subscriptionBalanceAfter: updated.subscriptionBalance,
        bonusBalanceAfter: updated.bonusBalance,
        rolloverBalanceAfter: updated.rolloverBalance,
        ...metadata,
      },
    },
  })

  return updated
}

async function grantInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  reason: string,
  adminId?: string,
  pool: 'bonus' | 'subscription' = 'bonus',
) {
  const account = await tx.creditAccount.findUnique({
    where: { userId },
  })

  if (!account) throw new Error('CreditAccount not found')

  const field = pool === 'bonus' ? 'bonusBalance' : 'subscriptionBalance'

  const updated = await tx.creditAccount.update({
    where: { userId },
    data: { [field]: { increment: amount } },
    select: { subscriptionBalance: true, bonusBalance: true, renewalDate: true },
  })

  const actingAdminId = adminId ?? userId

  await tx.auditLog.create({
    data: {
      userId,
      adminId: actingAdminId,
      action: 'CREDIT_CHANGE',
      targetType: 'USER',
      targetId: userId,
      details: {
        type: 'grant',
        pool,
        amount,
        reason,
        subscriptionBalanceAfter: updated.subscriptionBalance,
        bonusBalanceAfter: updated.bonusBalance,
      },
    },
  })

  return updated
}

export const creditService = {
  async deduct(userId: string, amount: number, reason: string, metadata?: Record<string, unknown>) {
    return db.$transaction((tx) => deductInTx(tx, userId, amount, reason, metadata))
  },

  deductInTx,

  async grantBonus(userId: string, amount: number, reason: string, adminId?: string) {
    return db.$transaction((tx) => grantInTx(tx, userId, amount, reason, adminId, 'bonus'))
  },

  async grantSubscription(userId: string, amount: number, reason: string, adminId?: string) {
    return db.$transaction((tx) => grantInTx(tx, userId, amount, reason, adminId, 'subscription'))
  },

  grantInTx,

  async getBalances(userId: string) {
    await db.$transaction((tx) => checkAndRenewInTx(tx, userId))

    const account = await db.creditAccount.findUnique({
      where: { userId },
      select: {
        subscriptionBalance: true,
        bonusBalance: true,
        rolloverBalance: true,
        rolloverExpiresAt: true,
        renewalDate: true,
      },
    })

    return {
      subscriptionBalance: account?.subscriptionBalance ?? 0,
      bonusBalance: account?.bonusBalance ?? 0,
      rolloverBalance: account?.rolloverBalance ?? 0,
      rolloverExpiresAt: account?.rolloverExpiresAt ?? null,
      total:
        (account?.subscriptionBalance ?? 0) +
        (account?.bonusBalance ?? 0) +
        (account?.rolloverBalance ?? 0),
      renewalDate: account?.renewalDate ?? null,
    }
  },

  async getBalance(userId: string) {
    return creditService.getBalances(userId)
  },

  async getTotalBalance(userId: string) {
    const balances = await creditService.getBalances(userId)
    return balances.total
  },

  async assignPlan(userId: string, planId: string) {
    const limit = getPlanCredits(planId)

    return db.$transaction(async (tx) => {
      const existingAccount = await tx.creditAccount.findUnique({
        where: { userId },
        include: { user: { select: { plan: true, razorpayCurrentPeriodEnd: true } } },
      })

      // Renewal Queuing: If existing plan period is still active, queue new 30 days from current expiry
      const currentExpiry =
        existingAccount?.renewalDate && existingAccount.renewalDate > now()
          ? existingAccount.renewalDate
          : existingAccount?.user?.razorpayCurrentPeriodEnd &&
            existingAccount.user.razorpayCurrentPeriodEnd > now()
          ? existingAccount.user.razorpayCurrentPeriodEnd
          : null

      const baseDate = currentExpiry ? new Date(currentExpiry) : new Date()
      baseDate.setDate(baseDate.getDate() + 30)
      const renewalDate = baseDate

      await tx.user.update({
        where: { id: userId },
        data: {
          plan: planId,
          razorpayCurrentPeriodEnd: renewalDate,
        },
      })

      const updated = await tx.creditAccount.upsert({
        where: { userId },
        update: {
          subscriptionBalance: limit,
          renewalDate,
        },
        create: {
          userId,
          subscriptionBalance: limit,
          bonusBalance: 0,
          renewalDate,
        },
        select: {
          subscriptionBalance: true,
          bonusBalance: true,
          rolloverBalance: true,
          rolloverExpiresAt: true,
          renewalDate: true,
        },
      })

      await tx.auditLog.create({
        data: {
          userId,
          adminId: userId,
          action: 'CREDIT_CHANGE',
          targetType: 'USER',
          targetId: userId,
          details: {
            type: 'plan_assignment',
            plan: planId,
            subscriptionCredits: limit,
            queuedFrom: currentExpiry ? currentExpiry.toISOString() : null,
            renewalDate: renewalDate.toISOString(),
          },
        },
      })

      return updated
    })
  },

  async renewSubscription(userId: string) {
    return db.$transaction(async (tx) => {
      const account = await tx.creditAccount.findUnique({
        where: { userId },
        include: { user: { select: { plan: true, razorpayCurrentPeriodEnd: true } } },
      })

      if (!account) throw new Error('CreditAccount not found')

      await expireRolloverInTx(tx, userId, account)

      const limit = getPlanCredits(account.user.plan)
      const rollover = rolloverOnRenewal(account, account.subscriptionBalance)

      // Renewal Queuing: Preserve remaining days
      const currentExpiry =
        account.renewalDate && account.renewalDate > now()
          ? account.renewalDate
          : account.user?.razorpayCurrentPeriodEnd && account.user.razorpayCurrentPeriodEnd > now()
          ? account.user.razorpayCurrentPeriodEnd
          : null

      const baseDate = currentExpiry ? new Date(currentExpiry) : new Date()
      baseDate.setDate(baseDate.getDate() + 30)
      const renewalDate = baseDate

      await tx.user.update({
        where: { id: userId },
        data: { razorpayCurrentPeriodEnd: renewalDate },
      })

      const updated = await tx.creditAccount.update({
        where: { userId },
        data: {
          subscriptionBalance: limit,
          renewalDate,
          rolloverBalance: rollover.rolloverBalance,
          rolloverExpiresAt: rollover.rolloverExpiresAt,
        },
        select: {
          subscriptionBalance: true,
          bonusBalance: true,
          rolloverBalance: true,
          rolloverExpiresAt: true,
          renewalDate: true,
        },
      })

      await tx.auditLog.create({
        data: {
          userId,
          adminId: userId,
          action: 'CREDIT_CHANGE',
          targetType: 'USER',
          targetId: userId,
          details: {
            type: 'manual_renewal',
            previousSubscriptionBalance: account.subscriptionBalance,
            newSubscriptionBalance: limit,
            rolledOver: rollover.rolloverBalance,
            rolloverExpiresAt: rollover.rolloverExpiresAt?.toISOString(),
            queuedFrom: currentExpiry ? currentExpiry.toISOString() : null,
            newRenewalDate: renewalDate.toISOString(),
          },
        },
      })

      return updated
    })
  },
}
