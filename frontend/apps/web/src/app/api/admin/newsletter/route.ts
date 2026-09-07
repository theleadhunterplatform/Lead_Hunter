import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { broadcastSchema, updateSubscriberSchema, subscribeSchema } from '@/lib/validators/newsletter'
import { emailService } from '@/lib/services/email'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const subscribers = await db.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const total = subscribers.length
    const byStatus = subscribers.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({ data: subscribers, total, byStatus })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 },
      )
    }
    console.error('[Admin Newsletter] GET error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to load subscribers' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const body = await request.json().catch(() => null)
    const action = (body as { action?: string } | null)?.action

    if (action === 'broadcast') {
      const parsed = broadcastSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid broadcast' },
          { status: 400 },
        )
      }
      const result = await emailService.sendBroadcast(
        parsed.data.subject,
        parsed.data.bodyHtml,
        parsed.data.bodyText,
      )
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'update') {
      const parsed = updateSubscriberSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid subscriber' },
          { status: 400 },
        )
      }
      const updated = await db.newsletterSubscriber.update({
        where: { email: parsed.data.email },
        data: { status: parsed.data.status },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    if (action === 'subscribe') {
      const parsed = subscribeSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid email' },
          { status: 400 },
        )
      }
      const existing = await db.newsletterSubscriber.findUnique({
        where: { email: parsed.data.email },
      })
      if (existing) {
        const updated = await db.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { status: 'SUBSCRIBED' },
        })
        return NextResponse.json({ success: true, data: updated })
      }
      const created = await db.newsletterSubscriber.create({
        data: {
          email: parsed.data.email,
          source: parsed.data.source || 'admin',
          unsubscribeToken: randomUUID(),
        },
      })
      return NextResponse.json({ success: true, data: created }, { status: 201 })
    }

    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Unknown action' },
      { status: 400 },
    )
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 },
      )
    }
    console.error('[Admin Newsletter] POST error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Operation failed' },
      { status: 500 },
    )
  }
}