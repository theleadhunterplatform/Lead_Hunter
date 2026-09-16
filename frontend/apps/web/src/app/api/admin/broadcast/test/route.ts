import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { emailService } from '@/lib/services/email'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const testSchema = z.object({
  toEmail: z.string().email('Valid test email address required'),
  flowType: z.enum(['application_received', 'approved', 'low_credits', 'renewal_reminder', 'custom']),
  subject: z.string().optional(),
  message: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    const parsed = testSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid test email parameters', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { toEmail, flowType, subject, message } = parsed.data

    let result: { id: string }

    switch (flowType) {
      case 'application_received':
        result = await emailService.sendApplicationReceived({
          name: 'Demo Member',
          email: toEmail,
        })
        break

      case 'approved':
        result = await emailService.sendApproved(
          { name: 'Demo Member', email: toEmail },
          'Freelancer Pro',
          500,
        )
        break

      case 'low_credits':
        result = await emailService.sendLowCreditsNudge(
          { name: 'Demo Member', email: toEmail },
          2,
        )
        break

      case 'renewal_reminder':
        result = await emailService.sendRenewalNotice(
          { name: 'Demo Member', email: toEmail },
          3,
          'Freelancer Pro',
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        )
        break

      case 'custom': {
        const customSubject = subject || 'Test Broadcast Announcement'
        const customMessage = message || 'This is a test broadcast sent from the Lead Hunter Admin Communications Hub.'
        const formattedHtml = `<p style="margin:0 0 16px;line-height:1.6">${customMessage.replace(/\n/g, '<br/>')}</p>`
        const res = await emailService.sendBroadcastToUsers(
          [{ name: 'Admin Tester', email: toEmail }],
          customSubject,
          formattedHtml,
          customMessage,
        )
        result = { id: res.sent > 0 ? 'sent' : 'error' }
        break
      }

      default:
        return NextResponse.json({ code: 'INVALID_FLOW', message: 'Unknown flow type' }, { status: 400 })
    }

    if (result.id === 'error') {
      return NextResponse.json(
        { success: false, message: `Failed to send test email to ${toEmail}. Check SMTP/Resend logs.` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      resultId: result.id,
      message: `Test email (${flowType}) delivered to ${toEmail}.`,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to send test email'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
