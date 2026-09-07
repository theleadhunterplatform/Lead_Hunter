import type { Prisma } from '@prisma/client'

export const ROLLOVER_VALIDITY_DAYS = 15

export interface RolloverAccountFields {
  rolloverBalance: number
  rolloverExpiresAt: Date | null
}

export function rolloverExpiryDate(from: Date): Date {
  const date = new Date(from)
  date.setDate(date.getDate() + ROLLOVER_VALIDITY_DAYS)
  return date
}

/**
 * Zeroes any expired rollover. Must be called inside a transaction that has
 * locked the account row (FOR UPDATE). Returns true if rollover was expired.
 */
export async function expireRolloverInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  account: RolloverAccountFields,
): Promise<boolean> {
  if (account.rolloverBalance > 0 && account.rolloverExpiresAt && new Date() >= account.rolloverExpiresAt) {
    await tx.creditAccount.update({
      where: { userId },
      data: { rolloverBalance: 0, rolloverExpiresAt: null },
    })

    await tx.auditLog.create({
      data: {
        userId,
        adminId: userId,
        action: 'CREDIT_CHANGE',
        targetType: 'USER',
        targetId: userId,
        details: {
          type: 'rollover_expired',
          amount: account.rolloverBalance,
          reason: 'rollover_validity_15_days',
        },
      },
    })

    return true
  }

  return false
}

/**
 * Computes the new rollover balance/expiry when renewing, given the account
 * state BEFORE the subscription balance is reset to the plan limit.
 * The full leftover carries over (no cap) and refreshes the 15-day expiry.
 */
export function rolloverOnRenewal(
  account: RolloverAccountFields,
  leftover: number,
): RolloverAccountFields {
  const expired = !!account.rolloverExpiresAt && new Date() >= account.rolloverExpiresAt
  const base = expired ? 0 : account.rolloverBalance
  const carry = leftover > 0 ? base + leftover : base

  return {
    rolloverBalance: carry,
    rolloverExpiresAt: carry > 0 ? rolloverExpiryDate(new Date()) : null,
  }
}
