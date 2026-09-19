import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, requireAuth, AuthRequiredError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/community/unread-popup
 * Checks if there is a new addition in the Community Hub that the user has not seen yet.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser?.uid) {
      return NextResponse.json({ show: false, message: 'Unauthenticated' })
    }

    const userId = authUser.uid

    // Get the latest published post in the community hub
    const latestPost = await db.communityPost.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        dealSize: true,
        clientNiche: true,
        imageUrl: true,
        authorName: true,
        authorPlan: true,
        createdAt: true,
      },
    })

    if (!latestPost) {
      return NextResponse.json({ show: false })
    }

    // Check if the user has already seen/dismissed this specific community post
    const seenLog = await db.auditLog.findFirst({
      where: {
        userId,
        action: 'COMMUNITY_POST_SEEN',
        targetId: latestPost.id,
      },
    })

    if (seenLog) {
      return NextResponse.json({ show: false })
    }

    return NextResponse.json({
      show: true,
      post: {
        ...latestPost,
        createdAt: latestPost.createdAt.toISOString(),
      },
    })
  } catch (error: unknown) {
    console.error('[Community Unread Popup GET] Error:', error)
    return NextResponse.json({ show: false }, { status: 200 })
  }
}

/**
 * POST /api/community/unread-popup
 * Records that the user has seen/dismissed a specific community post popup so it won't be shown again.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request)
    const userId = authUser.uid

    const body = await request.json().catch(() => ({}))
    const postId = String(body.postId || '').trim()

    if (!postId) {
      return NextResponse.json({ success: false, message: 'postId is required' }, { status: 400 })
    }

    const existing = await db.auditLog.findFirst({
      where: {
        userId,
        action: 'COMMUNITY_POST_SEEN',
        targetId: postId,
      },
    })

    if (!existing) {
      await db.auditLog.create({
        data: {
          userId,
          adminId: userId,
          action: 'COMMUNITY_POST_SEEN',
          targetType: 'COMMUNITY_POST',
          targetId: postId,
          details: { seenAt: new Date().toISOString() },
        },
      })
    }

    return NextResponse.json({ success: true, message: 'Popup marked as seen' })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ success: false, message: 'Login required' }, { status: 401 })
    }
    console.error('[Community Unread Popup POST] Error:', error)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
