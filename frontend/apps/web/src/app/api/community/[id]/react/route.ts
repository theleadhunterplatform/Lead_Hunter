import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, AuthRequiredError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ALLOWED_REACTIONS = ['fire', 'rocket', 'clap', 'heart'] as const
type AllowedReaction = (typeof ALLOWED_REACTIONS)[number]

/**
 * POST /api/community/[id]/react
 * Toggles a reaction (fire, rocket, clap, heart) on a community win post.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await requireAuth(request)
    const { id: postId } = await params
    const body = await request.json().catch(() => ({}))
    const { reactionType } = body

    if (!reactionType || !ALLOWED_REACTIONS.includes(reactionType as AllowedReaction)) {
      return NextResponse.json(
        { success: false, message: 'Invalid reaction type. Must be fire, rocket, clap, or heart.' },
        { status: 400 },
      )
    }

    const post = await db.communityPost.findUnique({
      where: { id: postId },
    })

    if (!post || post.status !== 'PUBLISHED') {
      return NextResponse.json({ success: false, message: 'Post not found or unavailable' }, { status: 404 })
    }

    // Check if the user has already reacted
    const existing = await db.communityReaction.findUnique({
      where: {
        postId_userId_reactionType: {
          postId,
          userId: authUser.uid,
          reactionType,
        },
      },
    })

    const rawReactions = (post.reactions as Record<string, number>) || {
      fire: 0,
      rocket: 0,
      clap: 0,
      heart: 0,
    }
    const updatedReactions = { ...rawReactions }

    if (existing) {
      // User is removing their reaction
      await db.communityReaction.delete({
        where: { id: existing.id },
      })
      updatedReactions[reactionType] = Math.max(0, (updatedReactions[reactionType] || 1) - 1)
    } else {
      // User is adding a reaction
      await db.communityReaction.create({
        data: {
          postId,
          userId: authUser.uid,
          reactionType,
        },
      })
      updatedReactions[reactionType] = (updatedReactions[reactionType] || 0) + 1
    }

    // Save updated counters back to the post
    await db.communityPost.update({
      where: { id: postId },
      data: { reactions: updatedReactions },
    })

    // Fetch all active reactions for this user on this post
    const userActiveReactions = await db.communityReaction.findMany({
      where: { postId, userId: authUser.uid },
      select: { reactionType: true },
    })

    return NextResponse.json({
      success: true,
      reactions: updatedReactions,
      userReactions: userActiveReactions.map((r) => r.reactionType),
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ success: false, message: 'Login required to react' }, { status: 401 })
    }
    console.error('[Community React] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update reaction'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
