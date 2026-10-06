import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { adminUserActionSchema } from '@/lib/validators/auth'
import { auditService } from '@/lib/services/audit'
import { creditService, InsufficientCreditsError } from '@/lib/services/credits'
import { emailService } from '@/lib/services/email'
import { getPlan } from '@/lib/config/plans'
import { getAdminAuthInstance } from '@/lib/firebase-admin'

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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const adjacentWhere: Record<string, unknown> = {}
    if (status && ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'].includes(status)) {
      adjacentWhere.status = status
    }

    const [prevUser, nextUser] = await Promise.all([
      db.user.findFirst({
        where: {
          ...adjacentWhere,
          createdAt: { gt: user.createdAt },
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true },
      }),
      db.user.findFirst({
        where: {
          ...adjacentWhere,
          createdAt: { lt: user.createdAt },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true },
      }),
    ])

    return NextResponse.json({
      data: userWithCredit,
      prevUser: prevUser || null,
      nextUser: nextUser || null,
    })
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
        const customRenewalDate = body.renewalDate ? new Date(body.renewalDate) : undefined
        await creditService.assignPlan(targetUserId, planId, {
          customRenewalDate,
          customCredits: body.subscriptionCredits,
          adminId: authUser.uid,
        })
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
          renewalDate: body.renewalDate,
          subscriptionCredits: body.subscriptionCredits,
        },
      })

      let emailResult: { success: boolean; error?: string } | null = null

      if (body.action === 'APPROVE' || body.action === 'ACTIVATE') {
        const initialCredits =
          body.subscriptionCredits !== undefined
            ? body.subscriptionCredits
            : (getPlan(body.plan || 'FREE')?.credits ?? 0)
        emailResult = await emailService.sendApproved(
          { name: user.name, email: user.email },
          body.plan || 'FREE',
          initialCredits,
        )
      } else if (body.action === 'REJECT') {
        emailResult = await emailService.sendRejected({ name: user.name, email: user.email })
      } else if (body.action === 'SUSPEND') {
        emailResult = await emailService.sendSuspended({ name: user.name, email: user.email })
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

      return NextResponse.json({
        data: responseData,
        emailSent: emailResult ? emailResult.success : undefined,
        emailError: emailResult ? emailResult.error : undefined,
      })
    }

    if (body.action === 'RESEND_APPROVAL_EMAIL') {
      const user = await db.user.findUnique({
        where: { id: targetUserId },
        include: { creditAccount: true },
      })
      if (!user) {
        return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
      }
      const initialCredits =
        user.creditAccount?.subscriptionBalance ?? (getPlan(user.plan || 'FREE')?.credits ?? 0)
      const emailResult = await emailService.sendApproved(
        { name: user.name, email: user.email },
        user.plan || 'FREE',
        initialCredits,
      )
      return NextResponse.json({
        success: emailResult.success,
        emailSent: emailResult.success,
        emailError: emailResult.error || null,
        message: emailResult.success
          ? `Welcome approval email delivered to ${user.email}.`
          : `Email dispatch failed: ${emailResult.error || 'Unknown error'}`,
      })
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

      if (user.email && amount > 0) {
        emailService
          .sendCreditTopup(
            { name: user.name || '', email: user.email },
            amount,
          )
          .catch((err) => console.warn('[Admin User] Topup email failed:', err))
      }

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

      const previousPlan = user.plan || 'FREE'
      const customRenewalDate = body.renewalDate ? new Date(body.renewalDate) : undefined
      const result = await creditService.assignPlan(targetUserId, body.changePlan, {
        customRenewalDate,
        customCredits: body.subscriptionCredits,
        adminId: authUser.uid,
      })

      if (user.email && body.changePlan !== previousPlan) {
        const planWeights: Record<string, number> = {
          FREE: 0,
          FREELANCER: 1,
          PAID: 1,
          AGENCY: 2,
          ENTERPRISE: 2,
        }
        const actionType =
          (planWeights[body.changePlan] ?? 1) > (planWeights[previousPlan] ?? 0)
            ? 'upgrade'
            : (planWeights[body.changePlan] ?? 1) < (planWeights[previousPlan] ?? 0)
            ? 'downgrade'
            : 'change'

        emailService
          .sendPlanChange(
            { name: user.name || '', email: user.email },
            body.changePlan,
            result.subscriptionBalance,
            actionType,
            previousPlan,
          )
          .catch((err) => console.warn('[Admin User] Plan change email failed:', err))
      }

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

    if (body.renewalDate !== undefined || body.subscriptionCredits !== undefined) {
      const user = await db.user.findUnique({ where: { id: targetUserId } })
      if (!user) {
        return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
      }

      const renewalDateObj = body.renewalDate ? new Date(body.renewalDate) : undefined

      let result
      if (renewalDateObj) {
        result = await creditService.updateRenewalDate(targetUserId, renewalDateObj, {
          subscriptionCredits: body.subscriptionCredits,
          adminId: authUser.uid,
        })
      } else if (body.subscriptionCredits !== undefined) {
        result = await db.creditAccount.update({
          where: { userId: targetUserId },
          data: { subscriptionBalance: body.subscriptionCredits },
          select: {
            subscriptionBalance: true,
            bonusBalance: true,
            rolloverBalance: true,
            rolloverExpiresAt: true,
            renewalDate: true,
          },
        })
      }

      if (result) {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await requireAdmin(request)
    const { id: targetUserId } = await params

    if (targetUserId === authUser.uid) {
      return NextResponse.json(
        { code: 'BAD_REQUEST', message: 'You cannot delete your own admin account' },
        { status: 400 },
      )
    }

    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
    }

    // 1. Delete user from Firebase Auth
    let fbDeleted = false
    try {
      const authInstance = await getAdminAuthInstance()
      await authInstance.deleteUser(targetUserId)
      fbDeleted = true
    } catch (fbErr: any) {
      console.warn(`[Admin User Delete] Firebase delete warning for ${targetUserId}:`, fbErr?.message)
    }

    // 2. Cascade delete all related database records and the user record
    await db.$transaction([
      db.crmActivity.deleteMany({ where: { userId: targetUserId } }),
      db.crmNote.deleteMany({ where: { userId: targetUserId } }),
      db.adminNote.deleteMany({ where: { userId: targetUserId } }),
      db.auditLog.deleteMany({ where: { userId: targetUserId } }),
      db.userLeadState.deleteMany({ where: { userId: targetUserId } }),
      db.creditAccount.deleteMany({ where: { userId: targetUserId } }),
      db.milestoneProof.deleteMany({ where: { userId: targetUserId } }),
      db.referral.deleteMany({
        where: {
          OR: [{ referrerId: targetUserId }, { referredUserId: targetUserId }],
        },
      }),
      db.supportTicket.deleteMany({ where: { userId: targetUserId } }),
      db.communityReaction.deleteMany({ where: { userId: targetUserId } }),
      db.user.delete({ where: { id: targetUserId } }),
    ])

    await auditService.log({
      userId: targetUserId,
      adminId: authUser.uid,
      action: 'USER_DELETE',
      targetType: 'USER',
      targetId: targetUserId,
      details: {
        deletedEmail: user.email,
        deletedName: user.name,
        firebaseDeleted: fbDeleted,
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `User ${user.name} (${user.email}) permanently deleted from database and Firebase Auth`,
      data: { id: targetUserId, firebaseDeleted: fbDeleted },
    })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    if (error instanceof Error && error.name === 'AuthRequiredError') {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
    }
    console.error('[Admin User Delete API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete user' },
      { status: 500 },
    )
  }
}
