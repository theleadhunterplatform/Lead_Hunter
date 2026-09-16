import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { getPlanCredits } from '@/lib/config/plans'
import { expireRolloverInTx, rolloverOnRenewal } from '@/lib/services/rollover'

export type PaymentProvider = 'razorpay'

export interface ActivatePlanParams {
  userId: string
  plan: string
  provider: PaymentProvider
  customerId?: string | null
  subscriptionId?: string | null
  priceId?: string | null
  periodEnd?: Date | null
}

function providerFields(
  provider: PaymentProvider,
  customerId?: string | null,
  subscriptionId?: string | null,
  priceId?: string | null,
  periodEnd?: Date | null,
) {
  return {
    razorpayCustomerId: customerId ?? null,
    razorpaySubscriptionId: subscriptionId ?? null,
    razorpayPlanId: priceId ?? null,
    razorpayCurrentPeriodEnd: periodEnd ?? null,
  }
}

function computeQueuedRenewalDate(currentRenewalDate?: Date | null, periodEnd?: Date | null): Date {
  const now = new Date()
  if (periodEnd && periodEnd > now) {
    return periodEnd
  }
  const baseDate = currentRenewalDate && currentRenewalDate > now ? new Date(currentRenewalDate) : new Date()
  baseDate.setDate(baseDate.getDate() + 30)
  return baseDate
}

export const paymentService = {
  /**
   * Activates (or upgrades) a user's plan from a payment webhook and makes
   * sure their credit account exists and is topped up to the plan limit.
   * Queues renewal dates if the user has remaining active days.
   */
  async activatePlan(params: ActivatePlanParams) {
    const { userId, plan, provider, customerId, subscriptionId, priceId, periodEnd } = params
    const limit = getPlanCredits(plan)

    return db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "credit_accounts" WHERE "userId" = ${userId} FOR UPDATE`

      const existing = await tx.creditAccount.findUnique({
        where: { userId },
        include: { user: { select: { razorpayCurrentPeriodEnd: true } } },
      })

      const currentExpiry =
        existing?.renewalDate && existing.renewalDate > new Date()
          ? existing.renewalDate
          : existing?.user?.razorpayCurrentPeriodEnd && existing.user.razorpayCurrentPeriodEnd > new Date()
          ? existing.user.razorpayCurrentPeriodEnd
          : null

      const renewalDate = computeQueuedRenewalDate(currentExpiry, periodEnd)

      await tx.user.update({
        where: { id: userId },
        data: {
          plan,
          paymentProvider: provider,
          ...providerFields(provider, customerId, subscriptionId, priceId, renewalDate),
        },
      })

      const account = existing
        ? await tx.creditAccount.update({
            where: { userId },
            data: {
              subscriptionBalance: limit,
              renewalDate,
            },
            select: { subscriptionBalance: true, bonusBalance: true, renewalDate: true },
          })
        : await tx.creditAccount.create({
            data: {
              userId,
              subscriptionBalance: limit,
              bonusBalance: 0,
              renewalDate,
            },
            select: { subscriptionBalance: true, bonusBalance: true, renewalDate: true },
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
            provider,
            plan,
            subscriptionCredits: limit,
            queuedFrom: currentExpiry ? currentExpiry.toISOString() : null,
            renewalDate: renewalDate.toISOString(),
          },
        },
      })

      return account
    })
  },

  /** Renews subscription credits after a successful recurring payment. */
  async renew(userId: string, provider: PaymentProvider, periodEnd?: Date) {
    return db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "credit_accounts" WHERE "userId" = ${userId} FOR UPDATE`

      const account = await tx.creditAccount.findUnique({
        where: { userId },
        include: { user: { select: { plan: true, razorpayCurrentPeriodEnd: true } } },
      })
      if (!account) throw new Error('CreditAccount not found')

      const limit = getPlanCredits(account.user.plan)
      const currentExpiry =
        account.renewalDate && account.renewalDate > new Date()
          ? account.renewalDate
          : account.user?.razorpayCurrentPeriodEnd && account.user.razorpayCurrentPeriodEnd > new Date()
          ? account.user.razorpayCurrentPeriodEnd
          : null

      const renewalDate = computeQueuedRenewalDate(currentExpiry, periodEnd)

      await expireRolloverInTx(tx, userId, account)
      const rollover = rolloverOnRenewal(account, account.subscriptionBalance)

      const data: Prisma.UserUpdateInput = {
        razorpayCurrentPeriodEnd: renewalDate,
      }

      await tx.user.update({ where: { id: userId }, data })

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
            type: 'renewal',
            provider,
            previousSubscriptionBalance: account.subscriptionBalance,
            newSubscriptionBalance: limit,
            rolledOver: rollover.rolloverBalance,
            rolloverExpiresAt: rollover.rolloverExpiresAt?.toISOString(),
            newRenewalDate: renewalDate.toISOString(),
          },
        },
      })

      return updated
    })
  },

  /** Cancels a subscription: resets plan to FREE, grants FREE-plan credits, clears provider references. */
  async cancel(userId: string, provider: PaymentProvider) {
    return db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "credit_accounts" WHERE "userId" = ${userId} FOR UPDATE`

      const freeCredits = getPlanCredits('FREE')

      await tx.user.update({
        where: { id: userId },
        data: {
          plan: 'FREE',
          paymentProvider: 'razorpay',
          ...providerFields(provider),
        },
      })

      await tx.creditAccount.update({
        where: { userId },
        data: {
          subscriptionBalance: freeCredits,
          renewalDate: nextRenewalDate(),
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
            type: 'subscription_cancelled',
            provider,
          },
        },
      })
    })
  },
}
