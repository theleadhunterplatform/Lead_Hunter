import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/community
 * Public / Member endpoint to fetch published social proof wins and spotlights.
 * Query params: ?category=ALL | DEAL_CLOSED | MEETING_SCHEDULED | POSITIVE_REPLY | SPOTLIGHT
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'ALL'

    const where: any = {
      status: 'PUBLISHED',
    }

    if (category !== 'ALL') {
      where.category = category
    }

    const [posts, totalDeals, totalMeetings, totalWins] = await Promise.all([
      db.communityPost.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: 50,
      }),
      db.communityPost.count({
        where: { status: 'PUBLISHED', category: 'DEAL_CLOSED' },
      }),
      db.communityPost.count({
        where: { status: 'PUBLISHED', category: 'MEETING_SCHEDULED' },
      }),
      db.communityPost.count({
        where: { status: 'PUBLISHED' },
      }),
    ])

    // If user is authenticated, fetch their reactions on these posts
    let userReactionsMap: Record<string, string[]> = {}
    if (authUser?.uid && posts.length > 0) {
      const postIds = posts.map((p) => p.id)
      const reactions = await db.communityReaction.findMany({
        where: {
          userId: authUser.uid,
          postId: { in: postIds },
        },
        select: { postId: true, reactionType: true },
      })

      for (const r of reactions) {
        if (!userReactionsMap[r.postId]) {
          userReactionsMap[r.postId] = []
        }
        userReactionsMap[r.postId].push(r.reactionType)
      }
    }

    const formattedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      dealSize: post.dealSize,
      clientNiche: post.clientNiche,
      imageUrl: post.imageUrl,
      authorName: post.authorName,
      authorPlan: post.authorPlan,
      isPinned: post.isPinned,
      reactions: (post.reactions as Record<string, number>) || {
        fire: 0,
        rocket: 0,
        clap: 0,
        heart: 0,
      },
      userReactions: userReactionsMap[post.id] || [],
      createdAt: post.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      stats: {
        totalDeals,
        totalMeetings,
        totalWins,
      },
      posts: formattedPosts,
    })
  } catch (error: unknown) {
    console.error('[Community GET] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch community posts'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
