import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { getPlanCredits } from '@/lib/config/plans'
import { expireRolloverInTx, rolloverOnRenewal } from '@/lib/services/rollover'

export type PaymentProvider = 'stripe' | 'razorpay'

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
  if (provider === 'razorpay') {
    return {
      razorpayCustomerId: customerId ?? null,
      razorpaySubscriptionId: subscriptionId ?? null,
      razorpayPlanId: priceId ?? null,
      razorpayCurrentPeriodEnd: periodEnd ?? null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
    }
  }
  return {
    stripeCustomerId: customerId ?? null,
    stripeSubscriptionId: subscriptionId ?? null,
    stripePriceId: priceId ?? null,
    stripeCurrentPeriodEnd: periodEnd ?? null,
    razorpayCustomerId: null,
    razorpaySubscriptionId: null,
    razorpayPlanId: null,
    razorpayCurrentPeriodEnd: null,
  }
}

function nextRenewalDate(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date
}

export const paymentService = {
  /**
   * Activates (or upgrades) a user's plan from a payment webhook and makes
   * sure their credit account exists and is topped up to the plan limit.
   */
  async activatePlan(params: ActivatePlanParams) {
    const { userId, plan, provider, customerId, subscriptionId, priceId, periodEnd } = params
    const limit = getPlanCredits(plan)
    const renewalDate = periodEnd ?? nextRenewalDate()

    return db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "credit_accounts" WHERE "userId" = ${userId} FOR UPDATE`

      await tx.user.update({
        where: { id: userId },
        data: {
          plan,
          paymentProvider: provider,
          ...providerFields(provider, customerId, subscriptionId, priceId, renewalDate),
        },
      })

      const existing = await tx.creditAccount.findUnique({ where: { userId } })
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
        include: { user: { select: { plan: true } } },
      })
      if (!account) throw new Error('CreditAccount not found')

      const limit = getPlanCredits(account.user.plan)
      const renewalDate = periodEnd ?? nextRenewalDate()

      await expireRolloverInTx(tx, userId, account)
      const rollover = rolloverOnRenewal(account, account.subscriptionBalance)

      const data: Prisma.UserUpdateInput = {}
      if (provider === 'razorpay') {
        data.razorpayCurrentPeriodEnd = renewalDate
      } else {
        data.stripeCurrentPeriodEnd = renewalDate
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
          paymentProvider: 'stripe',
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
