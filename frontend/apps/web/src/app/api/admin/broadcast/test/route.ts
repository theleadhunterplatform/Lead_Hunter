import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { emailService } from '@/lib/services/email'
import {
  renderApproved,
  renderRejected,
  renderSuspended,
  renderApplicationReceived,
  renderOnboardingComplete,
  renderOnboardingReminder,
  renderLowCreditsNudge,
  renderRenewalReminder,
  renderPlanChange,
  renderCreditTopup,
  renderTicketReply,
  renderLeadDropAlert,
} from '@/lib/email-templates'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const testSchema = z.object({
  toEmail: z.string().trim().email('Valid test email address required').optional().or(z.literal('')),
  testEmail: z.string().trim().email('Valid test email address required').optional().or(z.literal('')),
  email: z.string().trim().email('Valid test email address required').optional().or(z.literal('')),
  recipientName: z.string().optional(),
  userId: z.string().optional(),
  flowType: z
    .enum([
      'application_received',
      'onboarding_complete',
      'onboarding_reminder',
      'approved',
      'rejected',
      'suspended',
      'low_credits',
      'renewal_reminder',
      'plan_upgrade',
      'plan_downgrade',
      'plan_change',
      'credit_topup',
      'ticket_reply',
      'lead_drop',
      'custom',
    ])
    .optional()
    .default('custom'),
  subject: z.string().optional(),
  message: z.string().optional(),
  plan: z.string().optional(),
  credits: z.number().optional(),
  creditsAdded: z.number().optional(),
  ticketSubject: z.string().optional(),
  replyBody: z.string().optional(),
  leadTitle: z.string().optional(),
  leadNiche: z.string().optional(),
  previewOnly: z.boolean().optional(),
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

    const flowType = parsed.data.flowType || 'custom'
    const isPreviewOnly = Boolean(parsed.data.previewOnly)
    let toEmail = (parsed.data.toEmail || parsed.data.testEmail || parsed.data.email)?.trim() || ''
    let recipientName = parsed.data.recipientName?.trim() || ''
    let plan = parsed.data.plan?.trim() || 'Freelancer Pro'
    let credits = typeof parsed.data.credits === 'number' ? parsed.data.credits : 500

    // Look up real user details if userId or toEmail matches
    if (parsed.data.userId) {
      const user = await db.user.findUnique({
        where: { id: parsed.data.userId },
        include: { creditAccount: true },
      })
      if (user) {
        if (!toEmail) toEmail = user.email
        if (!recipientName) recipientName = user.name?.trim() || 'Demo Member'
        if (user.plan && !parsed.data.plan) plan = user.plan
        if (user.creditAccount && parsed.data.credits === undefined) {
          credits =
            (user.creditAccount.subscriptionBalance || 0) +
            (user.creditAccount.bonusBalance || 0) +
            (user.creditAccount.rolloverBalance || 0)
        }
      }
    } else if (toEmail) {
      const user = await db.user.findUnique({
        where: { email: toEmail },
        include: { creditAccount: true },
      })
      if (user) {
        if (!recipientName) recipientName = user.name?.trim() || 'Demo Member'
        if (user.plan && !parsed.data.plan) plan = user.plan
        if (user.creditAccount && parsed.data.credits === undefined) {
          credits =
            (user.creditAccount.subscriptionBalance || 0) +
            (user.creditAccount.bonusBalance || 0) +
            (user.creditAccount.rolloverBalance || 0)
        }
      }
    }

    if (!recipientName) recipientName = 'Demo Member'
    if (!toEmail) toEmail = 'member@theleadhunterclub.com'

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.theleadhunterclub.com').replace(/\/+$/, '')

    // Handle Live In-Browser Preview Mode (renders email without calling mailer)
    if (isPreviewOnly) {
      let rendered: { subject: string; text: string; html: string }

      switch (flowType) {
        case 'application_received':
          rendered = await renderApplicationReceived({ name: recipientName, appUrl })
          break
        case 'onboarding_complete':
          rendered = await renderOnboardingComplete({ name: recipientName, appUrl })
          break
        case 'onboarding_reminder':
          rendered = await renderOnboardingReminder({ name: recipientName, appUrl })
          break
        case 'approved':
          rendered = await renderApproved({ name: recipientName, plan, credits, appUrl })
          break
        case 'rejected':
          rendered = await renderRejected({ name: recipientName, appUrl })
          break
        case 'suspended':
          rendered = await renderSuspended({ name: recipientName, appUrl })
          break
        case 'low_credits':
          rendered = await renderLowCreditsNudge({ name: recipientName, credits: Math.min(credits, 2), appUrl })
          break
        case 'renewal_reminder':
          rendered = await renderRenewalReminder({
            name: recipientName,
            plan,
            daysRemaining: 3,
            renewalDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            appUrl,
          })
          break
        case 'plan_upgrade':
          rendered = await renderPlanChange({
            name: recipientName,
            newPlan: 'Agency Pro',
            credits: 1200,
            actionType: 'upgrade',
            oldPlan: plan || 'Freelancer Starter',
            appUrl,
          })
          break
        case 'plan_downgrade':
          rendered = await renderPlanChange({
            name: recipientName,
            newPlan: 'Freelancer Starter',
            credits: 300,
            actionType: 'downgrade',
            oldPlan: plan || 'Agency Pro',
            appUrl,
          })
          break
        case 'plan_change':
          rendered = await renderPlanChange({
            name: recipientName,
            newPlan: plan,
            credits,
            actionType: 'change',
            oldPlan: 'Custom Plan',
            appUrl,
          })
          break
        case 'credit_topup':
          rendered = await renderCreditTopup({
            name: recipientName,
            creditsAdded: parsed.data.creditsAdded || 50,
            newTotalBalance: credits + (parsed.data.creditsAdded || 50),
            appUrl,
          })
          break
        case 'ticket_reply':
          rendered = await renderTicketReply({
            name: recipientName,
            ticketSubject: parsed.data.ticketSubject || 'Inquiry: API webhook limits',
            replyBody:
              parsed.data.replyBody ||
              'Hi! We reviewed your account and updated your concurrency quota. Let us know if you have any questions.',
            appUrl,
          })
          break
        case 'lead_drop':
          rendered = await renderLeadDropAlert({
            name: recipientName,
            leadTitle: parsed.data.leadTitle || 'High-Ticket Next.js & Stripe Platform Redesign',
            niche: parsed.data.leadNiche || 'Web & App Development',
            platform: 'LinkedIn',
            snippet: 'Seeking a senior agency/engineer to rebuild client subscription dashboard. Immediate budget: $8,000-$12,000.',
            leadUrl: `${appUrl}/leads`,
            appUrl,
          })
          break
        case 'custom':
        default: {
          const customSubject = parsed.data.subject || 'Platform Announcement'
          const customMessage = parsed.data.message || 'Write your announcement content in the composer...'
          rendered = {
            subject: customSubject,
            text: customMessage,
            html: customMessage,
          }
          break
        }
      }

      return NextResponse.json({
        success: true,
        previewOnly: true,
        flowType,
        toEmail,
        recipientName,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      })
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

    if (!toEmail || !toEmail.includes('@')) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Valid test email address required' },
        { status: 400 },
      )
    }

    const { subject, message } = parsed.data
    let result: { id: string; success: boolean; error?: string }

    switch (flowType) {
      case 'application_received':
        result = await emailService.sendApplicationReceived({
          name: recipientName,
          email: toEmail,
        })
        break

      case 'onboarding_complete':
        result = await emailService.sendOnboardingComplete({
          name: recipientName,
          email: toEmail,
        })
        break

      case 'onboarding_reminder':
        result = await emailService.sendOnboardingReminder({
          name: recipientName,
          email: toEmail,
        })
        break

      case 'approved':
        result = await emailService.sendApproved(
          { name: recipientName, email: toEmail },
          plan,
          credits,
        )
        break

      case 'rejected':
        result = await emailService.sendRejected({
          name: recipientName,
          email: toEmail,
        })
        break

      case 'suspended':
        result = await emailService.sendSuspended({
          name: recipientName,
          email: toEmail,
        })
        break

      case 'low_credits':
        result = await emailService.sendLowCreditsNudge(
          { name: recipientName, email: toEmail },
          Math.min(credits, 2),
        )
        break

      case 'renewal_reminder':
        result = await emailService.sendRenewalNotice(
          { name: recipientName, email: toEmail },
          3,
          plan,
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        )
        break

      case 'plan_upgrade':
        result = await emailService.sendPlanChange(
          { name: recipientName, email: toEmail },
          'Agency Pro',
          1200,
          'upgrade',
          plan || 'Freelancer Starter',
        )
        break

      case 'plan_downgrade':
        result = await emailService.sendPlanChange(
          { name: recipientName, email: toEmail },
          'Freelancer Starter',
          300,
          'downgrade',
          plan || 'Agency Pro',
        )
        break

      case 'plan_change':
        result = await emailService.sendPlanChange(
          { name: recipientName, email: toEmail },
          plan,
          credits,
          'change',
          'Custom Plan',
        )
        break

      case 'credit_topup':
        result = await emailService.sendCreditTopup(
          { name: recipientName, email: toEmail },
          parsed.data.creditsAdded || 50,
          credits + (parsed.data.creditsAdded || 50),
        )
        break

      case 'ticket_reply':
        result = await emailService.sendTicketReply({
          name: recipientName,
          email: toEmail,
          ticketSubject: parsed.data.ticketSubject || 'Inquiry: API webhook limits',
          replyBody:
            parsed.data.replyBody ||
            'Hi! We reviewed your account and updated your concurrency quota. Let us know if you have any questions.',
          ticketUrl: `${appUrl}/support`,
        })
        break

      case 'lead_drop':
        result = await emailService.sendLeadDropAlert(
          { name: recipientName, email: toEmail },
          {
            title: parsed.data.leadTitle || 'High-Ticket Next.js & Stripe Platform Redesign',
            niche: parsed.data.leadNiche || 'Web & App Development',
            platform: 'LinkedIn',
            snippet: 'Seeking a senior agency/engineer to rebuild client subscription dashboard. Immediate budget: $8,000-$12,000.',
            leadUrl: `${appUrl}/leads`,
          },
        )
        break

      case 'custom': {
        const customSubject = subject || 'Test Broadcast Announcement'
        const customMessage = message || 'This is a test broadcast sent from the Lead Hunter Admin Communications Hub.'
        const res = await emailService.sendBroadcastToUsers(
          [{ name: recipientName, email: toEmail }],
          customSubject,
          '',
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

    if (!result.success || result.id === 'error') {
      const failureReason = result.error || `Failed to dispatch email to ${toEmail}.`
      return NextResponse.json(
        { success: false, message: failureReason },
        { status: 400 },
      )
    }

    const providerNotice = result.id === 'mock-sent'
      ? 'Mock Mode - Check SMTP keys'
      : (health.provider || 'Brevo SMTP')

    return NextResponse.json({
      success: true,
      resultId: result.id,
      message: `Test email (${flowType}) delivered to ${toEmail} (${providerNotice}).`,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to send test email'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
