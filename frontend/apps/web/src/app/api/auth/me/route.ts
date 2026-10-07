import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { rateLimitByKey } from '@/lib/rate-limit'
import { getPlanCredits } from '@/lib/config/plans'
import { referralService } from '@/lib/services/referral'
import { getAdminAuthInstance } from '@/lib/firebase-admin'
import { parseProfilePatch, findDuplicateSocialLink, profilePayload } from '@/lib/profile'

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
    const authUser = await getAuthUser(request)
    if (!authUser) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      const ipRl = await rateLimitByKey(`ip:unauth:${ip}`, 60, 60_000)
      if (!ipRl.allowed) {
        return NextResponse.json(
          { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
          { status: 429 },
        )
      }
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }

    // Rate limit per authenticated user (120 req/min) so users sharing an IP or network never block each other
    const rl = await rateLimitByKey(`user:${authUser.uid}:auth-me`, 120, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        { status: 429 },
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
      user.phone &&
      user.linkedin &&
      (user.servicesOffered?.length ?? 0) > 0 &&
      (user.preferredLeadCategories?.length ?? 0) > 0 &&
      user.outreachExperience &&
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
        ...profilePayload(user),
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

    const rawBody = await request.json().catch(() => ({}))
    const body: Record<string, unknown> =
      rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {}

    const { name, city, referralCode, phone } = body

    const updateData: any = {}
    if (typeof name === 'string' && name.trim()) {
      updateData.name = name.trim()
    }
    if (typeof city === 'string') {
      updateData.city = city.trim()
    }
    if (typeof phone === 'string' && phone.trim()) {
      updateData.phone = phone.trim()
    }

    // Profile & socials (settings editor): validated subset of the onboarding
    // data. Privileged fields (role, status, plan, credits...) are never read.
    const profileResult = parseProfilePatch(body)
    if (!profileResult.ok) {
      return NextResponse.json(
        { code: profileResult.code, message: profileResult.message },
        { status: 400 },
      )
    }
    const profileData = profileResult.data
    if (Object.keys(profileData).length > 0) {
      const duplicateSocial = await findDuplicateSocialLink(authUser.uid, profileData)
      if (duplicateSocial) {
        return NextResponse.json(
          {
            code: 'DUPLICATE_SOCIAL_LINK',
            message:
              'A social media profile provided is already linked to another Lead Hunter account. Each member must register with their own unique profile to prevent credit abuse.',
          },
          { status: 400 },
        )
      }
      Object.assign(updateData, profileData)
    }

    const user = await db.user.upsert({
      where: { id: authUser.uid },
      update: updateData,
      create: {
        id: authUser.uid,
        email: authUser.email || '',
        name: typeof name === 'string' && name.trim() ? name.trim() : authUser.name || 'User',
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : authUser.phone || null,
        city: typeof city === 'string' ? city.trim() : null,
        role: 'user',
        status: 'PENDING',
        ...profileData,
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
        ...profilePayload(user),
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

export async function DELETE(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitByKey(`ip:${ip}:me-delete`, 5, 60_000)
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

    const user = await db.user.findUnique({
      where: { id: authUser.uid },
      select: { id: true, emailVerified: true },
    })

    if (user?.emailVerified || (!user && authUser.emailVerified)) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Verified accounts cannot be deleted here.' },
        { status: 403 },
      )
    }

    const referral = user
      ? await db.referral.findUnique({
          where: { referredUserId: authUser.uid },
          select: { code: true },
        })
      : null

    // Delete the Firebase account server-side first: the admin SDK has no
    // "recent login" requirement (client-side delete() can hit
    // requires-recent-login). Failure falls back to client-side delete().
    try {
      const adminAuth = await getAdminAuthInstance()
      await adminAuth.deleteUser(authUser.uid)
    } catch (delErr) {
      console.warn('[Auth Me DELETE] Admin Firebase delete failed, client fallback:', delErr)
    }

    if (user) {
      await db.user.delete({ where: { id: authUser.uid } })
    }
    return NextResponse.json({ data: { deleted: true, referralCode: referral?.code ?? null } })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'P2025') {
      return NextResponse.json({ data: { deleted: true } })
    }
    console.error('[Auth Me DELETE] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete account data' },
      { status: 500 },
    )
  }
}
