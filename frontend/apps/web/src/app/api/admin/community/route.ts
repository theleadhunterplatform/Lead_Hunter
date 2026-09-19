import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createPostSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Story content must be at least 10 characters'),
  category: z.enum(['DEAL_CLOSED', 'MEETING_SCHEDULED', 'POSITIVE_REPLY', 'SPOTLIGHT']).default('DEAL_CLOSED'),
  dealSize: z.string().optional().nullable(),
  clientNiche: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  authorName: z.string().min(2, 'Author name is required'),
  authorPlan: z.string().default('Pro Member'),
  isPinned: z.boolean().default(false),
  status: z.enum(['PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
})

/**
 * GET /api/admin/community
 * Lists all community posts for admin moderation.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const [posts, totalCount, publishedCount, archivedCount, approvedProofs] = await Promise.all([
      db.communityPost.findMany({
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      }),
      db.communityPost.count(),
      db.communityPost.count({ where: { status: 'PUBLISHED' } }),
      db.communityPost.count({ where: { status: 'ARCHIVED' } }),
      // Also fetch recent approved milestone proofs eligible to be featured in the community
      db.milestoneProof.findMany({
        where: { status: 'APPROVED' },
        orderBy: { reviewedAt: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true, email: true, plan: true } } },
      }),
    ])

    // Find which proofIds have already been featured in community
    const featuredProofIds = new Set(posts.map((p) => p.proofId).filter(Boolean))

    const eligibleProofs = approvedProofs.map((proof) => ({
      id: proof.id,
      userId: proof.userId,
      type: proof.type,
      imageUrl: proof.imageUrl,
      note: proof.note,
      creditsAwarded: proof.creditsAwarded,
      reviewedAt: proof.reviewedAt,
      user: proof.user,
      isFeatured: featuredProofIds.has(proof.id),
    }))

    return NextResponse.json({
      success: true,
      stats: {
        totalCount,
        publishedCount,
        archivedCount,
      },
      posts,
      eligibleProofs,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }
    console.error('[Admin Community GET] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch community posts'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

/**
 * POST /api/admin/community
 * Admin creates a new verified win post or spotlight.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json().catch(() => ({}))
    const parsed = createPostSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid post data',
        },
        { status: 400 },
      )
    }

    const newPost = await db.communityPost.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        category: parsed.data.category,
        dealSize: parsed.data.dealSize || null,
        clientNiche: parsed.data.clientNiche || null,
        imageUrl: parsed.data.imageUrl || null,
        authorName: parsed.data.authorName,
        authorPlan: parsed.data.authorPlan || 'Pro Member',
        isPinned: parsed.data.isPinned,
        status: parsed.data.status,
        reactions: { fire: 0, rocket: 0, clap: 0, heart: 0 },
      },
    })

    return NextResponse.json({
      success: true,
      post: newPost,
      message: 'Community win post created successfully',
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }
    console.error('[Admin Community POST] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create post'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
