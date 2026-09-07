import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { rateLimitByKey } from '@/lib/rate-limit'
import { getPlanCredits } from '@/lib/config/plans'

export const dynamic = 'force-dynamic'

const creditAccountInclude = {
  creditAccount: {
    select: {
      subscriptionBalance: true,
      bonusBalance: true,
      rolloverBalance: true,
      rolloverExpiresAt: true,
      renewalDate: true,
    },
  },
} as const

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
      include: creditAccountInclude,
    })

    if (!user && email) {
      const byEmail = await db.user.findUnique({
        where: { email },
        include: creditAccountInclude,
      })
      if (byEmail && byEmail.id !== uid) {
        // User exists in DB with a different ID (Oracle UUID) — migrate to Firebase UID
        // This handles the case where Oracle created the user before Firebase auth was set up
        try {
          // Update credit_accounts FK first, then update user id
          await db.$executeRawUnsafe(
            `UPDATE credit_accounts SET "userId" = $1 WHERE "userId" = $2`,
            uid,
            byEmail.id,
          )
          await db.$executeRawUnsafe(
            `UPDATE audit_logs SET "userId" = $1 WHERE "userId" = $2`,
            uid,
            byEmail.id,
          )
          await db.$executeRawUnsafe(
            `UPDATE user_lead_states SET "userId" = $1 WHERE "userId" = $2`,
            uid,
            byEmail.id,
          )
          await db.$executeRawUnsafe(
            `UPDATE admin_notes SET "userId" = $1 WHERE "userId" = $2`,
            uid,
            byEmail.id,
          )
          await db.$executeRawUnsafe(
            `UPDATE support_tickets SET "userId" = $1 WHERE "userId" = $2`,
            uid,
            byEmail.id,
          )
          await db.$executeRawUnsafe(
            `UPDATE users SET id = $1 WHERE id = $2`,
            uid,
            byEmail.id,
          )
          user = await db.user.findUnique({
            where: { id: uid },
            include: creditAccountInclude,
          })
        } catch (migrateErr) {
          console.error('[Auth Me] Failed to migrate user ID:', migrateErr)
          // Fall back to using existing user as-is
          user = byEmail
        }
      }
      if (!user && byEmail) user = byEmail
    }

    if (!user) {
      const limit = getPlanCredits('FREE')
      const renewalDate = new Date()
      renewalDate.setDate(renewalDate.getDate() + 30)

      try {
        user = await db.user.create({
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
          include: creditAccountInclude,
        })
      } catch (createError) {
        if (
          createError instanceof Prisma.PrismaClientKnownRequestError &&
          createError.code === 'P2002' &&
          email
        ) {
          user = await db.user.findUnique({
            where: { email },
            include: creditAccountInclude,
          })
          if (!user) throw createError
          if (user.id !== uid) {
            return NextResponse.json(
              {
                code: 'ACCOUNT_CONFLICT',
                message: 'This email is already linked to another account. Sign in with the original method.',
              },
              { status: 409 },
            )
          }
        } else {
          throw createError
        }
      }
    } else if (email && email !== user.email) {
      user = await db.user.update({
        where: { id: user.id },
        data: { email },
        include: creditAccountInclude,
      })
    }

    if (!user) {
      throw new Error('Failed to load or create user')
    }

    if (!user.creditAccount) {
      const limit = getPlanCredits(user.plan || 'FREE')
      const renewalDate = new Date()
      renewalDate.setDate(renewalDate.getDate() + 30)
      user = await db.user.update({
        where: { id: user.id },
        data: {
          creditAccount: {
            create: { subscriptionBalance: limit, bonusBalance: 0, renewalDate },
          },
        },
        include: creditAccountInclude,
      })
    }

    if (emailVerified === true && !user.emailVerified) {
      user = await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
        include: creditAccountInclude,
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
