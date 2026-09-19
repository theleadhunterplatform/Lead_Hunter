import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updatePostSchema = z.object({
  title: z.string().min(3).optional(),
  content: z.string().min(10).optional(),
  category: z.enum(['DEAL_CLOSED', 'MEETING_SCHEDULED', 'POSITIVE_REPLY', 'SPOTLIGHT']).optional(),
  dealSize: z.string().optional().nullable(),
  clientNiche: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  authorName: z.string().min(2).optional(),
  authorPlan: z.string().optional(),
  isPinned: z.boolean().optional(),
  status: z.enum(['PUBLISHED', 'ARCHIVED']).optional(),
})

/**
 * PATCH /api/admin/community/[id]
 * Updates a community post.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = updatePostSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid update data',
        },
        { status: 400 },
      )
    }

    const updated = await db.communityPost.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({
      success: true,
      post: updated,
      message: 'Post updated successfully',
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }
    console.error('[Admin Community PATCH] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update post'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/community/[id]
 * Deletes a community post.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request)
    const { id } = await params

    await db.communityPost.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Community post deleted successfully',
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }
    console.error('[Admin Community DELETE] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete post'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
