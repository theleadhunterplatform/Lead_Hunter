import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { adminUserActionSchema } from '@/lib/validators/auth'
import { auditService } from '@/lib/services/audit'
import { creditService, InsufficientCreditsError } from '@/lib/services/credits'
import { emailService } from '@/lib/services/email'
import { getPlan } from '@/lib/config/plans'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)

    const { id: targetUserId } = await params

    const user = await db.user.findUnique({
      where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          plan: true,
          tags: true,
          portfolio: true,
        website: true,
        linkedin: true,
        instagram: true,
        dribbble: true,
        behance: true,
        github: true,
        twitter: true,
        servicesOffered: true,
        preferredLeadCategories: true,
        outreachExperience: true,
        discoverySource: true,
        createdAt: true,
        updatedAt: true,
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
      return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
    }

    const userWithCredit = {
      ...user,
      creditAccount: user.creditAccount
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
          },
    }

    return NextResponse.json({ data: userWithCredit })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 },
      )
    }
    if (error instanceof Error && error.name === 'AuthRequiredError') {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    console.error('[Admin User Detail API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAdmin(request)

    const { id: targetUserId } = await params

    const rawBody = await request.json()
    const parsed = adminUserActionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const body = parsed.data

    if (body.action) {
      const statusMap: Record<string, string> = {
        APPROVE: 'ACTIVE',
        REJECT: 'REJECTED',
        SUSPEND: 'SUSPENDED',
        ACTIVATE: 'ACTIVE',
      }

      const user = await db.user.findUnique({ where: { id: targetUserId } })
      if (!user) {
        return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
      }

      const newStatus = statusMap[body.action]
      await db.user.update({
        where: { id: targetUserId },
        data: { status: newStatus },
      })

      if (body.action === 'APPROVE' || body.action === 'ACTIVATE') {
        const planId = body.plan || 'FREE'
        await creditService.assignPlan(targetUserId, planId)
      }

      const updated = await db.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          status: true,
          email: true,
          name: true,
          plan: true,
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

      await auditService.log({
        userId: targetUserId,
        adminId: authUser.uid,
        action: 'STATUS_CHANGE',
        targetType: 'USER',
        targetId: targetUserId,
        details: {
          from: user.status,
          to: statusMap[body.action],
          method: body.action,
          plan:
            body.action === 'APPROVE' || body.action === 'ACTIVATE'
              ? body.plan || 'FREE'
              : undefined,
        },
      })

      if (body.action === 'APPROVE' || body.action === 'ACTIVATE') {
        emailService.sendApproved(
          { name: user.name, email: user.email },
          body.plan || 'FREE',
          getPlan(body.plan || 'FREE')?.credits ?? 0,
        )
      } else if (body.action === 'REJECT') {
        emailService.sendRejected({ name: user.name, email: user.email })
      } else if (body.action === 'SUSPEND') {
        emailService.sendSuspended({ name: user.name, email: user.email })
      }

      const responseData = updated
        ? {
            ...updated,
            creditAccount: updated.creditAccount
              ? {
                  subscriptionBalance: updated.creditAccount.subscriptionBalance,
                  bonusBalance: updated.creditAccount.bonusBalance,
                  rolloverBalance: updated.creditAccount.rolloverBalance,
                  rolloverExpiresAt:
                    updated.creditAccount.rolloverExpiresAt?.toISOString() || null,
                  total:
                    updated.creditAccount.subscriptionBalance +
                    updated.creditAccount.bonusBalance +
                    updated.creditAccount.rolloverBalance,
                  renewalDate: updated.creditAccount.renewalDate?.toISOString() || null,
                }
              : {
                  subscriptionBalance: 0,
                  bonusBalance: 0,
                  rolloverBalance: 0,
                  rolloverExpiresAt: null,
                  total: 0,
                  renewalDate: null,
                },
          }
        : null

      return NextResponse.json({ data: responseData })
    }

    if (body.action === 'RENEW_NOW') {
      const user = await db.user.findUnique({ where: { id: targetUserId } })
      if (!user) {
        return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
      }

      const result = await creditService.renewSubscription(targetUserId)

      await auditService.log({
        userId: targetUserId,
        adminId: authUser.uid,
        action: 'CREDIT_CHANGE',
        targetType: 'USER',
        targetId: targetUserId,
        details: { type: 'admin_forced_renewal' },
      })

      return NextResponse.json({
        data: {
          id: targetUserId,
          email: user.email,
          name: user.name,
          plan: user.plan,
          creditAccount: {
            subscriptionBalance: result.subscriptionBalance,
            bonusBalance: result.bonusBalance,
            rolloverBalance: result.rolloverBalance,
            rolloverExpiresAt: result.rolloverExpiresAt?.toISOString() || null,
            total:
              result.subscriptionBalance + result.bonusBalance + result.rolloverBalance,
            renewalDate: result.renewalDate?.toISOString() || null,
          },
        },
      })
    }

    if (body.bonusCredits !== undefined) {
      const user = await db.user.findUnique({
        where: { id: targetUserId },
        include: {
          creditAccount: {
            select: { subscriptionBalance: true, bonusBalance: true },
          },
        },
      })
      if (!user) {
        return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
      }

      const amount = body.bonusCredits
      if (amount < 0) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Bonus credits cannot be negative' },
          { status: 400 },
        )
      }

      await creditService.grantBonus(targetUserId, amount, 'admin_grant_bonus', authUser.uid)

      const updatedAccount = await db.creditAccount.findUnique({
        where: { userId: targetUserId },
        select: {
          subscriptionBalance: true,
          bonusBalance: true,
          rolloverBalance: true,
          rolloverExpiresAt: true,
          renewalDate: true,
        },
      })

      return NextResponse.json({
        data: {
          id: targetUserId,
          email: user.email,
          name: user.name,
          creditAccount: {
            subscriptionBalance: updatedAccount?.subscriptionBalance ?? 0,
            bonusBalance: updatedAccount?.bonusBalance ?? 0,
            rolloverBalance: updatedAccount?.rolloverBalance ?? 0,
            rolloverExpiresAt: updatedAccount?.rolloverExpiresAt?.toISOString() || null,
            total:
              (updatedAccount?.subscriptionBalance ?? 0) +
              (updatedAccount?.bonusBalance ?? 0) +
              (updatedAccount?.rolloverBalance ?? 0),
            renewalDate: updatedAccount?.renewalDate?.toISOString() || null,
          },
        },
      })
    }

    if (body.tags !== undefined) {
      await db.user.update({
        where: { id: targetUserId },
        data: { tags: body.tags },
      })
      return NextResponse.json({ data: { id: targetUserId, tags: body.tags } })
    }

    if (body.changePlan !== undefined) {
      const user = await db.user.findUnique({ where: { id: targetUserId } })
      if (!user) {
        return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
      }

      const validPlans = ['FREE', 'FREELANCER', 'AGENCY']
      if (!validPlans.includes(body.changePlan)) {
        return NextResponse.json(
          {
            code: 'VALIDATION_ERROR',
            message: `Invalid plan. Must be one of: ${validPlans.join(', ')}`,
          },
          { status: 400 },
        )
      }

      const result = await creditService.assignPlan(targetUserId, body.changePlan)

      return NextResponse.json({
        data: {
          id: targetUserId,
          email: user.email,
          name: user.name,
          plan: body.changePlan,
          creditAccount: {
            subscriptionBalance: result.subscriptionBalance,
            bonusBalance: result.bonusBalance,
            rolloverBalance: result.rolloverBalance,
            rolloverExpiresAt: result.rolloverExpiresAt?.toISOString() || null,
            total:
              result.subscriptionBalance + result.bonusBalance + result.rolloverBalance,
            renewalDate: result.renewalDate?.toISOString() || null,
          },
        },
      })
    }
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 },
      )
    }
    if (error instanceof Error && error.name === 'AuthRequiredError') {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient credits', required: error.required },
        { status: 400 },
      )
    }
    console.error('[Admin User Update API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id: targetUserId } = await params

    const user = await db.user.findUnique({ where: { id: targetUserId } })
    if (!user) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
    }

    // Delete from Firebase Authentication
    try {
      const adminAuth = await import('@/lib/firebase-admin').then(m => m.getAdminAuthInstance())
      await adminAuth.deleteUser(targetUserId)
    } catch (firebaseErr: any) {
      // If user doesn't exist in Firebase, continue with DB deletion
      if (firebaseErr?.code !== 'auth/user-not-found') {
        console.error('[Admin Delete User] Firebase deletion failed:', firebaseErr?.message)
      }
    }

    // Delete from DB (cascade deletes credit_accounts, UserLeadState etc.)
    await db.user.delete({ where: { id: targetUserId } })

    return NextResponse.json({ success: true, message: 'User deleted from DB and Firebase' })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    console.error('[Admin Delete User] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete user' },
      { status: 500 },
    )
  }
}
