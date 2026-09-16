import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createTemplateSchema = z.object({
  name: z.string().min(2, 'Template name must be at least 2 characters'),
  subject: z.string().min(2, 'Subject must be at least 2 characters'),
  body: z.string().min(5, 'Body must be at least 5 characters'),
  category: z.string().default('general'),
})

/**
 * GET: Lists all available broadcast templates.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const templates = await db.broadcastTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      templates,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch broadcast templates'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

/**
 * POST: Creates a new broadcast template.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const body = await request.json()
    const parsed = createTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid template data',
        },
        { status: 400 },
      )
    }

    const newTemplate = await db.broadcastTemplate.create({
      data: {
        name: parsed.data.name,
        subject: parsed.data.subject,
        body: parsed.data.body,
        category: parsed.data.category,
        createdById: admin.id,
      },
    })

    return NextResponse.json({
      success: true,
      template: newTemplate,
      message: 'Template created successfully',
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to save broadcast template'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
