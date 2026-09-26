import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { emailService } from '@/lib/services/email'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const broadcastSchema = z.object({
  audience: z.enum(['ALL', 'PAID', 'FREE']),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

/**
 * GET: Returns audience stats, recent email logs, and SMTP connection diagnostics.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const [totalActive, paidCount, freeCount, recentLogs, smtpStatus] = await Promise.all([
      db.user.count({ where: { status: 'ACTIVE' } }),
      db.user.count({ where: { status: 'ACTIVE', plan: { in: ['FREELANCER', 'AGENCY'] } } }),
      db.user.count({ where: { status: 'ACTIVE', plan: 'FREE' } }),
      db.emailLog.findMany({
        take: 30,
        orderBy: { sentAt: 'desc' },
      }),
      emailService.verifySmtpConnection(),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        totalActive,
        paidSubscribers: paidCount,
        freeStarters: freeCount,
      },
      smtpStatus,
      recentLogs,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch broadcast center data'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

/**
 * POST: Sends an announcement broadcast to target member segment.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    const parsed = broadcastSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid broadcast parameters', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { audience, subject, message } = parsed.data

    const whereClause: Record<string, unknown> = { status: 'ACTIVE' }
    if (audience === 'PAID') {
      whereClause.plan = { in: ['FREELANCER', 'AGENCY'] }
    } else if (audience === 'FREE') {
      whereClause.plan = 'FREE'
    }

    const recipients = await db.user.findMany({
      where: whereClause,
      select: { name: true, email: true },
    })

    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No active members matched the selected audience segment.',
      })
    }

    // Convert plain linebreaks to HTML paragraphs if not already HTML
    const formattedHtml = message.includes('<p>') || message.includes('<div>')
      ? message
      : message
          .split('\n\n')
          .map((para) => `<p style="margin:0 0 16px;line-height:1.6">${para.replace(/\n/g, '<br/>')}</p>`)
          .join('')

    const health = await emailService.verifySmtpConnection()
    if (!health.working) {
      return NextResponse.json(
        {
          code: 'MAILER_NOT_CONNECTED',
          message: `Cannot dispatch broadcast: ${health.message}`,
        },
        { status: 400 },
      )
    }

    const dispatchResult = await emailService.sendBroadcastToUsers(
      recipients,
      subject,
      formattedHtml,
      message,
    )

    if (dispatchResult.sent === 0 && dispatchResult.failed > 0) {
      const failureReason = dispatchResult.errors.length > 0
        ? dispatchResult.errors[0]
        : 'Failed to deliver broadcast emails. Check SMTP configuration.'
      return NextResponse.json(
        {
          success: false,
          sent: 0,
          failed: dispatchResult.failed,
          message: failureReason,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      sent: dispatchResult.sent,
      failed: dispatchResult.failed,
      totalRecipients: recipients.length,
      message: `Broadcast complete: ${dispatchResult.sent} emails delivered successfully${dispatchResult.failed > 0 ? `, ${dispatchResult.failed} failed` : ''}.`,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Broadcast dispatch failed'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
