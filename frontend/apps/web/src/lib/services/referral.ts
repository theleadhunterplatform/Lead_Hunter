import crypto from 'crypto'
import { db } from '@/lib/db'
import { creditService } from '@/lib/services/credits'

export const REFERRER_BONUS_CREDITS = 10
export const REFERRED_WELCOME_BONUS_CREDITS = 5

function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'LH'
  const randomBytes = crypto.randomBytes(6)
  for (let i = 0; i < 6; i++) {
    code += chars[randomBytes[i] % chars.length]
  }
  return code
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'User'
  const [local, domain] = email.split('@')
  if (local.length <= 2) {
    return `${local}***@${domain}`
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`
}

export const referralService = {
  /**
   * Retrieves an existing referral code for a user or creates a unique one.
   */
  async getOrCreateReferralCode(userId: string): Promise<string> {
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    })

    if (existing?.referralCode) {
      return existing.referralCode
    }

    // Generate a unique code
    let code = ''
    let isUnique = false
    let attempts = 0

    while (!isUnique && attempts < 10) {
      code = generateRandomCode()
      const collision = await db.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
      })
      if (!collision) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      code = `LH${Date.now().toString(36).toUpperCase().slice(-6)}`
    }

    await db.user.update({
      where: { id: userId },
      data: { referralCode: code },
    })

    return code
  },

  /**
   * Attributes a referral when a new user signs up with a referral code.
   */
  async attributeReferral({
    referredUserId,
    referralCode,
  }: {
    referredUserId: string
    referralCode: string
  }): Promise<{ success: boolean; reason?: string; creditsAwarded?: number }> {
    const normalizedCode = referralCode.trim().toUpperCase()
    if (!normalizedCode) {
      return { success: false, reason: 'EMPTY_CODE' }
    }

    // 1. Locate the referrer by their unique code
    const referrer = await db.user.findUnique({
      where: { referralCode: normalizedCode },
      select: { id: true, email: true, status: true },
    })

    if (!referrer) {
      return { success: false, reason: 'INVALID_CODE' }
    }

    // 2. Prevent self-referrals
    if (referrer.id === referredUserId) {
      return { success: false, reason: 'SELF_REFERRAL' }
    }

    // 3. Prevent duplicate referrals
    const alreadyReferred = await db.referral.findUnique({
      where: { referredUserId },
    })

    if (alreadyReferred) {
      return { success: false, reason: 'ALREADY_REFERRED' }
    }

    // 4. In a transaction, record the referral and award bonuses
    return await db.$transaction(async (tx) => {
      // Ensure both accounts have a credit account record initialized
      const [refAccount, newUserAccount] = await Promise.all([
        tx.creditAccount.findUnique({ where: { userId: referrer.id } }),
        tx.creditAccount.findUnique({ where: { userId: referredUserId } }),
      ])

      if (!refAccount) {
        await tx.creditAccount.create({
          data: {
            userId: referrer.id,
            subscriptionBalance: 50,
            bonusBalance: 0,
            renewalDate: new Date(Date.now() + 30 * 86400000),
          },
        })
      }

      if (!newUserAccount) {
        await tx.creditAccount.create({
          data: {
            userId: referredUserId,
            subscriptionBalance: 50,
            bonusBalance: 0,
            renewalDate: new Date(Date.now() + 30 * 86400000),
          },
        })
      }

      // Create referral record
      await tx.referral.create({
        data: {
          referrerId: referrer.id,
          referredUserId,
          code: normalizedCode,
          creditsAwarded: REFERRER_BONUS_CREDITS,
          status: 'COMPLETED',
        },
      })

      // Link referredById on user
      await tx.user.update({
        where: { id: referredUserId },
        data: { referredById: referrer.id },
      })

      // Award bonus credits to referrer (+10) within the transaction
      await creditService.grantInTx(
        tx,
        referrer.id,
        REFERRER_BONUS_CREDITS,
        `Referral reward: invited user ${referredUserId.slice(0, 8)}`,
        referrer.id,
        'bonus',
      )

      // Award welcome bonus credits to the referred user (+5) within the transaction
      await creditService.grantInTx(
        tx,
        referredUserId,
        REFERRED_WELCOME_BONUS_CREDITS,
        `Welcome referral bonus using code ${normalizedCode}`,
        referredUserId,
        'bonus',
      )

      return {
        success: true,
        creditsAwarded: REFERRER_BONUS_CREDITS,
      }
    })
  },

  /**
   * Fetches stats and referral history for the user dashboard.
   */
  async getReferralStats(userId: string, appUrl?: string) {
    const referralCode = await this.getOrCreateReferralCode(userId)
    const baseUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://leadhunterclub.vercel.app'
    const referralUrl = `${baseUrl.replace(/\/+$/, '')}/register?ref=${referralCode}`

    const [userAccount, totalInvited, sumResult, history] = await Promise.all([
      db.creditAccount.findUnique({
        where: { userId },
        select: { bonusBalance: true, subscriptionBalance: true },
      }),
      db.referral.count({
        where: { referrerId: userId },
      }),
      db.referral.aggregate({
        where: { referrerId: userId },
        _sum: { creditsAwarded: true },
      }),
      db.referral.findMany({
        where: { referrerId: userId },
        include: {
          referredUser: {
            select: { id: true, name: true, email: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    return {
      referralCode,
      referralUrl,
      stats: {
        totalInvited,
        creditsEarned: sumResult._sum.creditsAwarded || 0,
        currentBonusBalance: userAccount?.bonusBalance ?? 0,
      },
      history: history.map((r) => ({
        id: r.id,
        name: r.referredUser?.name || 'Anonymous Member',
        maskedEmail: maskEmail(r.referredUser?.email || ''),
        joinedAt: r.createdAt.toISOString(),
        creditsAwarded: r.creditsAwarded,
        status: r.status,
      })),
    }
  },
}
