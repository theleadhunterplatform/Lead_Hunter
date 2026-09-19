import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const fromProofSchema = z.object({
  proofId: z.string().uuid('Invalid milestone proof ID'),
  title: z.string().min(3).optional(),
  content: z.string().min(5).optional(),
  category: z.enum(['DEAL_CLOSED', 'MEETING_SCHEDULED', 'POSITIVE_REPLY', 'SPOTLIGHT']).optional(),
  dealSize: z.string().optional().nullable(),
  clientNiche: z.string().optional().nullable(),
  isPinned: z.boolean().default(false),
})

const CATEGORY_DEFAULT_TITLES: Record<string, string> = {
  DEAL_CLOSED: 'Client Contract Closed via Lead Hunter Outreach',
  MEETING_SCHEDULED: 'Sales Call Booked with Decision Maker',
  POSITIVE_REPLY: 'Positive Outreach Response & Warm Conversation Started',
  SPOTLIGHT: 'Member Success Spotlight',
}

/**
 * POST /api/admin/community/from-proof
 * 1-Click features an approved MilestoneProof into a published CommunityPost.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json().catch(() => ({}))
    const parsed = fromProofSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid parameters',
        },
        { status: 400 },
      )
    }

    const { proofId, title, content, category, dealSize, clientNiche, isPinned } = parsed.data

    const proof = await db.milestoneProof.findUnique({
      where: { id: proofId },
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

    if (!proof) {
      return NextResponse.json(
        { success: false, message: 'Milestone proof not found' },
        { status: 404 },
      )
    }

    if (proof.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, message: 'Only approved milestone proofs can be featured in the Community Hub' },
        { status: 400 },
      )
    }

    // Check if this proof is already featured
    const existingPost = await db.communityPost.findFirst({
      where: { proofId },
    })

    if (existingPost) {
      return NextResponse.json(
        {
          success: false,
          message: 'This proof has already been published to the Community Hub',
          postId: existingPost.id,
        },
        { status: 400 },
      )
    }

    const finalCategory = category || (proof.type as any) || 'DEAL_CLOSED'
    const finalTitle = title || CATEGORY_DEFAULT_TITLES[finalCategory] || 'Verified Member Win'
    const finalContent =
      content ||
      proof.note ||
      `Verified success by ${proof.user?.name || 'Club Member'} using Lead Hunter outreach signals.`

    const authorPlan = proof.user?.plan
      ? `${proof.user.plan.charAt(0)}${proof.user.plan.slice(1).toLowerCase()} Member`
      : 'Pro Member'

    const newPost = await db.communityPost.create({
      data: {
        title: finalTitle,
        content: finalContent,
        category: finalCategory,
        dealSize: dealSize || null,
        clientNiche: clientNiche || null,
        imageUrl: proof.imageUrl,
        authorName: proof.user?.name || 'Club Member',
        authorPlan,
        userId: proof.userId,
        proofId: proof.id,
        isPinned,
        status: 'PUBLISHED',
        reactions: {
          fire: 0,
          rocket: 0,
          clap: 0,
          heart: 0,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Proof successfully featured in the Community Hub',
      post: newPost,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }
    console.error('[Admin Community from-proof] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to publish proof to community'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
