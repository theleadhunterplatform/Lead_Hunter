import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { emailService } from '@/lib/services/email'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const testSchema = z.object({
  toEmail: z.string().trim().email('Valid test email address required').optional().or(z.literal('')),
  testEmail: z.string().trim().email('Valid test email address required').optional().or(z.literal('')),
  email: z.string().trim().email('Valid test email address required').optional().or(z.literal('')),
  flowType: z
    .enum([
      'application_received',
      'approved',
      'low_credits',
      'renewal_reminder',
      'plan_upgrade',
      'plan_downgrade',
      'plan_change',
      'credit_topup',
      'custom',
    ])
    .optional()
    .default('custom'),
  subject: z.string().optional(),
  message: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json().catch(() => ({}))
    const parsed = testSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid test email parameters', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // 1. Pre-flight verification of SMTP connection
    const health = await emailService.verifySmtpConnection()
    if (!health.working) {
      return NextResponse.json(
        {
          success: false,
          code: 'MAILER_NOT_CONNECTED',
          message: health.message,
          provider: health.provider,
        },
        { status: 400 },
      )
    }

    const toEmail = (parsed.data.toEmail || parsed.data.testEmail || parsed.data.email)?.trim()
    if (!toEmail) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Valid test email address required' },
        { status: 400 },
      )
    }

    const flowType = parsed.data.flowType || 'custom'
    const { subject, message } = parsed.data

    let result: { id: string; success: boolean; error?: string }

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

      case 'plan_upgrade':
        result = await emailService.sendPlanChange(
          { name: 'Demo Member', email: toEmail },
          'Agency Pro',
          1200,
          'upgrade',
          'Freelancer Starter',
        )
        break

      case 'plan_downgrade':
        result = await emailService.sendPlanChange(
          { name: 'Demo Member', email: toEmail },
          'Freelancer Starter',
          300,
          'downgrade',
          'Agency Pro',
        )
        break

      case 'plan_change':
        result = await emailService.sendPlanChange(
          { name: 'Demo Member', email: toEmail },
          'Freelancer Starter',
          300,
          'change',
          'Custom Plan',
        )
        break

      case 'credit_topup':
        result = await emailService.sendCreditTopup(
          { name: 'Demo Member', email: toEmail },
          50,
          350,
        )
        break

      case 'custom': {
        const customSubject = subject || 'Test Broadcast Announcement'
        const customMessage = message || 'This is a test broadcast sent from the Lead Hunter Admin Communications Hub.'
        const recipientUser = await db.user.findUnique({
          where: { email: toEmail },
          select: { name: true },
        })
        const recipientName = recipientUser?.name?.trim() || 'Admin Tester'
        const formattedHtml = `<p style="margin:0 0 16px;line-height:1.6">${customMessage.replace(/\n/g, '<br/>')}</p>`
        const res = await emailService.sendBroadcastToUsers(
          [{ name: recipientName, email: toEmail }],
          customSubject,
          formattedHtml,
          customMessage,
        )
        if (res.sent > 0) {
          result = { id: 'sent', success: true }
        } else {
          result = {
            id: 'error',
            success: false,
            error: res.errors.length > 0 ? res.errors[0] : 'Failed to send test email',
          }
        }
        break
      }

      default:
        return NextResponse.json({ code: 'INVALID_FLOW', message: 'Unknown flow type' }, { status: 400 })
    }

    if (!result.success || result.id === 'error' || result.id === 'mock-sent') {
      const failureReason = result.error || `Failed to dispatch email to ${toEmail}.`
      return NextResponse.json(
        { success: false, message: failureReason },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      resultId: result.id,
      message: `Test email (${flowType}) delivered to ${toEmail} via ${health.provider}.`,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to send test email'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
