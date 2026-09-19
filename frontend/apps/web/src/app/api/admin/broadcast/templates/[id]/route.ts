import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { z } from 'zod'
import { invalidateBroadcastTemplatesCache } from '../route'

export const dynamic = 'force-dynamic'

const updateTemplateSchema = z.object({
  name: z.string().min(2, 'Template name must be at least 2 characters'),
  subject: z.string().min(2, 'Subject must be at least 2 characters'),
  body: z.string().min(5, 'Body must be at least 5 characters'),
  category: z.string().default('general'),
})

/**
 * PUT: Updates an existing broadcast template.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json()
    const parsed = updateTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid template data',
        },
        { status: 400 },
      )
    }

    const updated = await db.broadcastTemplate.update({
      where: { id },
      data: {
        name: parsed.data.name,
        subject: parsed.data.subject,
        body: parsed.data.body,
        category: parsed.data.category,
      },
    })

    invalidateBroadcastTemplatesCache()

    return NextResponse.json({
      success: true,
      template: updated,
      message: 'Template updated successfully',
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to update broadcast template'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

/**
 * DELETE: Removes a broadcast template.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request)
    const { id } = await params

    await db.broadcastTemplate.delete({
      where: { id },
    })

    invalidateBroadcastTemplatesCache()

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to delete broadcast template'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
