import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { rateLimitByKey } from '@/lib/rate-limit'
import { getPlanCredits } from '@/lib/config/plans'
import { referralService } from '@/lib/services/referral'

export const dynamic = 'force-dynamic'

function isPrismaMissingTable(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2021'
  )
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitByKey(`ip:${ip}`, 30, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        { status: 429 },
      )
    }

    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }

    const { uid, email, name, phone, emailVerified } = authUser

    let user = await db.user.findUnique({
      where: { id: uid },
      include: {
        creditAccount: {
          select: {
              subscriptionBalance: true,
              bonusBalance: true,
              rolloverBalance: true,
              rolloverExpiresAt: true,
              renewalDate: true,
            },
        },
      },
    })

    if (!user) {
      const limit = getPlanCredits('FREE')
      const renewalDate = new Date()
      renewalDate.setDate(renewalDate.getDate() + 30)

      user = await db.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({
          where: { id: uid },
          include: {
            creditAccount: {
              select: {
              subscriptionBalance: true,
              bonusBalance: true,
              rolloverBalance: true,
              rolloverExpiresAt: true,
              renewalDate: true,
            },
            },
          },
        })
        if (existing) return existing

        return tx.user.create({
          data: {
            id: uid,
            email: email || '',
            name: name || 'User',
            phone: phone || null,
            role: 'user',
            status: 'PENDING',
            creditAccount: {
              create: { subscriptionBalance: limit, bonusBalance: 0, renewalDate },
            },
          },
          include: {
            creditAccount: {
              select: {
              subscriptionBalance: true,
              bonusBalance: true,
              rolloverBalance: true,
              rolloverExpiresAt: true,
              renewalDate: true,
            },
            },
          },
        })
      })
    } else if (email && email !== user.email) {
      user = await db.user.update({
        where: { id: uid },
        data: { email },
        include: {
          creditAccount: {
            select: {
              subscriptionBalance: true,
              bonusBalance: true,
              rolloverBalance: true,
              rolloverExpiresAt: true,
              renewalDate: true,
            },
          },
        },
      })
    }

    if (emailVerified === true && !user.emailVerified) {
      user = await db.user.update({
        where: { id: uid },
        data: { emailVerified: new Date() },
        include: {
          creditAccount: {
            select: {
              subscriptionBalance: true,
              bonusBalance: true,
              rolloverBalance: true,
              rolloverExpiresAt: true,
              renewalDate: true,
            },
          },
        },
      })
    }

    const hasCompletedOnboarding = !!(
      user.portfolio ||
      user.website ||
      user.linkedin ||
      user.instagram ||
      (user.servicesOffered?.length ?? 0) > 0 ||
      (user.preferredLeadCategories?.length ?? 0) > 0 ||
      user.outreachExperience ||
      user.discoverySource
    )

    const creditAccount = user.creditAccount
      ? {
          subscriptionBalance: user.creditAccount.subscriptionBalance,
          bonusBalance: user.creditAccount.bonusBalance,
          rolloverBalance: user.creditAccount.rolloverBalance,
          rolloverExpiresAt: user.creditAccount.rolloverExpiresAt?.toISOString() || null,
          total:
            user.creditAccount.subscriptionBalance +
            user.creditAccount.bonusBalance +
            user.creditAccount.rolloverBalance,
          renewalDate: user.creditAccount.renewalDate?.toISOString() || null,
        }
      : {
          subscriptionBalance: 0,
          bonusBalance: 0,
          rolloverBalance: 0,
          rolloverExpiresAt: null,
          total: 0,
          renewalDate: null,
        }

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || null,
        role: user.role,
        creditAccount,
        status: user.status,
        provider: email ? 'email' : 'phone',
        emailVerified: user.emailVerified?.toISOString() || null,
        plan: user.plan,
        hasCompletedOnboarding,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[Auth Me API] Error:', error)
    const missingTable = isPrismaMissingTable(error)
    const message =
      process.env.NODE_ENV !== 'production' && error instanceof Error
        ? error.message
        : missingTable
          ? 'App user tables are missing. Run prisma/create-club-tables.sql against DATABASE_URL.'
          : 'An unexpected error occurred'
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const { name, city, referralCode } = body

    const updateData: any = {}
    if (typeof name === 'string' && name.trim()) {
      updateData.name = name.trim()
    }
    if (typeof city === 'string') {
      updateData.city = city.trim()
    }

    const user = await db.user.upsert({
      where: { id: authUser.uid },
      update: updateData,
      create: {
        id: authUser.uid,
        email: authUser.email || '',
        name: typeof name === 'string' && name.trim() ? name.trim() : authUser.name || 'User',
        phone: authUser.phone || null,
        city: typeof city === 'string' ? city.trim() : null,
        role: 'user',
        status: 'PENDING',
        creditAccount: {
          create: {
            subscriptionBalance: getPlanCredits('FREE'),
            bonusBalance: 0,
            renewalDate: new Date(Date.now() + 30 * 86400000),
          },
        },
      },
    })

    if (typeof referralCode === 'string' && referralCode.trim()) {
      try {
        await referralService.attributeReferral({
          referredUserId: authUser.uid,
          referralCode: referralCode.trim(),
        })
      } catch (refErr) {
        console.warn('[Auth Me PATCH] Failed to attribute referral:', refErr)
      }
    }

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        city: (user as any).city || null,
      },
    })
  } catch (error) {
    console.error('[Auth Me PATCH] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update profile' },
      { status: 500 },
    )
  }
}
