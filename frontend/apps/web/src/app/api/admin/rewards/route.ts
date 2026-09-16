import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { db } from '@/lib/db'
import { creditService } from '@/lib/services/credits'

export const dynamic = 'force-dynamic'

const DEFAULT_CREDITS: Record<string, number> = {
  POSITIVE_REPLY: 10,
  MEETING_SCHEDULED: 25,
  DEAL_CLOSED: 50,
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const proofs = await db.milestoneProof.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            plan: true,
          },
        },
      },
    })

    const totalSubmissions = proofs.length
    const pendingCount = proofs.filter((p) => p.status === 'PENDING').length
    const approvedCount = proofs.filter((p) => p.status === 'APPROVED').length
    const rejectedCount = proofs.filter((p) => p.status === 'REJECTED').length
    const totalCreditsAwarded = proofs.reduce((sum, p) => sum + (p.creditsAwarded || 0), 0)

    return NextResponse.json({
      success: true,
      data: {
        proofs,
        stats: {
          totalSubmissions,
          pendingCount,
          approvedCount,
          rejectedCount,
          totalCreditsAwarded,
        },
      },
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }
    console.error('[Admin Rewards GET] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load milestone proofs' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request)
    const body = await request.json().catch(() => ({}))

    const { id, action, creditsAwarded, adminNote } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, message: 'Proof ID is required' }, { status: 400 })
    }

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ success: false, message: 'Action must be APPROVE or REJECT' }, { status: 400 })
    }

    const proof = await db.milestoneProof.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    if (!proof) {
      return NextResponse.json({ success: false, message: 'Milestone proof not found' }, { status: 404 })
    }

    if (proof.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: `This proof has already been ${proof.status.toLowerCase()}` },
        { status: 400 },
      )
    }

    if (action === 'APPROVE') {
      const parsedCredits = Number(creditsAwarded)
      const credits = Number.isInteger(parsedCredits) && parsedCredits > 0
        ? parsedCredits
        : (DEFAULT_CREDITS[proof.type] || 10)

      // Grant credits directly to user's bonus balance
      const grantResult = await creditService.grantBonus(
        proof.userId,
        credits,
        `Milestone Reward: ${proof.type.replace(/_/g, ' ')} verified by admin`,
        adminUser.uid,
      )

      const updated = await db.milestoneProof.update({
        where: { id },
        data: {
          status: 'APPROVED',
          creditsAwarded: credits,
          adminNote: adminNote ? String(adminNote).trim() : null,
          reviewedAt: new Date(),
          reviewedBy: adminUser.uid,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, plan: true },
          },
        },
      })

      return NextResponse.json({
        success: true,
        message: `Approved! ${credits} bonus credits awarded to ${proof.user?.name || proof.user?.email}`,
        data: updated,
        newBalance: grantResult.bonusBalance,
      })
    }

    // Action === 'REJECT'
    const updated = await db.milestoneProof.update({
      where: { id },
      data: {
        status: 'REJECTED',
        creditsAwarded: 0,
        adminNote: adminNote ? String(adminNote).trim() : 'Proof does not meet verification requirements.',
        reviewedAt: new Date(),
        reviewedBy: adminUser.uid,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, plan: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Milestone submission has been rejected',
      data: updated,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }
    console.error('[Admin Rewards PATCH] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update milestone proof' },
      { status: 500 },
    )
  }
}
