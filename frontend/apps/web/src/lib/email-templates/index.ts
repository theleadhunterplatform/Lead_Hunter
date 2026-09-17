import { db } from '@/lib/db'

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.02em">Lead Hunter Club</h1>
          ${body}
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0" />
          <p style="margin:0;font-size:12px;color:#888;line-height:1.5">
            Lead Hunter Club &mdash; Find & close your ideal clients<br>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://leadhunterclub.com'}" style="color:#dc3b4c;text-decoration:none">Visit dashboard</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function interpolateVariables(content: string, vars: Record<string, string | number>): string {
  let result = content
  for (const [key, val] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi')
    result = result.replace(regex, String(val ?? ''))
  }
  return result
}

function textToHtmlBody(text: string, cta?: { text: string; url: string }): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const renderedParagraphs = paragraphs
    .map((p) => {
      const lines = p.split('\n').map((l) => l.trim())
      const isBulletList = lines.every((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'))

      if (isBulletList && lines.length > 0) {
        const items = lines
          .map((l) => {
            const itemText = l.replace(/^[•\-\*]\s*/, '')
            return `<li style="margin:4px 0">${escapeHtml(itemText)}</li>`
          })
          .join('')
        return `<ul style="margin:16px 0;padding-left:20px;font-size:15px;color:#ccc;line-height:1.6">${items}</ul>`
      }

      const escaped = lines
        .map((l) => {
          return escapeHtml(l).replace(
            /(https?:\/\/[^\s<]+)/g,
            '<a href="$1" style="color:#dc3b4c;text-decoration:underline" target="_blank">$1</a>',
          )
        })
        .join('<br/>')

      return `<p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">${escaped}</p>`
    })
    .join('')

  const ctaButton = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 16px">
        <tr>
          <td align="center" style="border-radius:10px;background:#dc3b4c">
            <a href="${cta.url}" target="_blank" style="display:inline-block;padding:12px 28px;background:#dc3b4c;color:#ffffff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.01em">${escapeHtml(
        cta.text,
      )}</a>
          </td>
        </tr>
      </table>`
    : ''

  return renderedParagraphs + ctaButton
}

async function resolveDynamicTemplate(options: {
  templateId: string
  fallbackSubject: string
  fallbackBody: string
  variables: Record<string, string | number>
  cta?: { text: string; url: string }
}): Promise<{ subject: string; text: string; html: string }> {
  let rawSubject = options.fallbackSubject
  let rawBody = options.fallbackBody

  try {
    const tpl = await db.broadcastTemplate.findUnique({
      where: { id: options.templateId },
    })
    if (tpl?.subject && tpl?.body) {
      rawSubject = tpl.subject
      rawBody = tpl.body
    }
  } catch (err) {
    console.warn(`[Email Template] Could not load template "${options.templateId}" from DB, using fallback:`, err)
  }

  const subject = interpolateVariables(rawSubject, options.variables)
  const text = interpolateVariables(rawBody, options.variables)
  const bodyHtml = textToHtmlBody(text, options.cta)
  const html = wrapHtml(bodyHtml)

  return { subject, text, html }
}

export interface TemplateData {
  name: string
  appUrl: string
}

export interface ApprovedData extends TemplateData {
  plan: string
  credits: number
}

export interface RejectedData extends TemplateData {}

export interface SuspendedData extends TemplateData {}

export interface ApplicationReceivedData extends TemplateData {}

export interface TicketReplyData extends TemplateData {
  ticketSubject: string
  replyBody: string
}

export interface LowCreditsData {
  name: string
  credits: number
  appUrl: string
}

export interface RenewalReminderData {
  name: string
  plan: string
  daysRemaining: number
  renewalDate: string
  appUrl: string
}

export interface EmailVerificationData {
  name?: string
  email: string
  verificationUrl: string
  appUrl: string
}

export interface NewsletterConfirmationData extends TemplateData {
  confirmUrl: string
}

export interface NewsletterData {
  subject: string
  bodyHtml: string
  bodyText: string
  unsubscribeUrl: string
}

export interface BroadcastData {
  subject: string
  messageHtml: string
  messageText: string
  appUrl: string
}

// 1. Account Approved
export async function renderApproved(data: ApprovedData) {
  return resolveDynamicTemplate({
    templateId: 'tpl-auto-account-approved',
    fallbackSubject: `Welcome to Lead Hunter Club — You've been approved!`,
    fallbackBody: `Hi {{name}},

Great news! Your application has been approved with the {{plan}} plan, including {{credits}} coins.

You can now log in and start hunting leads right away:
{{appUrl}}/dashboard

To your outreach success,
The Lead Hunter Club Team`,
    variables: {
      name: data.name,
      plan: data.plan,
      credits: data.credits,
      appUrl: data.appUrl,
    },
    cta: {
      text: 'Go to Dashboard',
      url: `${data.appUrl}/dashboard`,
    },
  })
}

// 2. Account Rejected
export async function renderRejected(data: RejectedData) {
  return resolveDynamicTemplate({
    templateId: 'tpl-auto-account-rejected',
    fallbackSubject: `Update on your Lead Hunter Club application`,
    fallbackBody: `Hi {{name}},

Thank you for your interest in Lead Hunter Club. Unfortunately, we are unable to approve your application at this time, as it didn't meet our current criteria.

We're happy to review again if your circumstances change. If you have questions, our support team is here to help:
{{appUrl}}/support

Best regards,
The Lead Hunter Club Team`,
    variables: {
      name: data.name,
      appUrl: data.appUrl,
    },
    cta: {
      text: 'Contact Support',
      url: `${data.appUrl}/support`,
    },
  })
}

// 3. Account Suspended
export async function renderSuspended(data: SuspendedData) {
  return resolveDynamicTemplate({
    templateId: 'tpl-auto-account-suspended',
    fallbackSubject: `Lead Hunter Club — Account suspended`,
    fallbackBody: `Hi {{name}},

Your account has been suspended. If you believe this was done in error or would like to request an appeal, please contact support:
{{appUrl}}/support

Lead Hunter Club Security`,
    variables: {
      name: data.name,
      appUrl: data.appUrl,
    },
    cta: {
      text: 'Contact Support',
      url: `${data.appUrl}/support`,
    },
  })
}

// 4. Application Received
export async function renderApplicationReceived(data: ApplicationReceivedData) {
  return resolveDynamicTemplate({
    templateId: 'tpl-auto-application-received',
    fallbackSubject: `Application received — Lead Hunter Club`,
    fallbackBody: `Hi {{name}},

We've received your application. Our team will review it shortly and you'll hear back from us soon.

In the meantime, feel free to check your application status:
{{appUrl}}/pending-approval`,
    variables: {
      name: data.name,
      appUrl: data.appUrl,
    },
    cta: {
      text: 'Check Status',
      url: `${data.appUrl}/pending-approval`,
    },
  })
}

// 5. Onboarding Complete
export async function renderOnboardingComplete(data: ApplicationReceivedData) {
  return resolveDynamicTemplate({
    templateId: 'tpl-auto-application-received',
    fallbackSubject: `We're reviewing your application — Lead Hunter Club`,
    fallbackBody: `Hi {{name}},

Thanks for completing your profile! We've received everything and our team is currently reviewing your application.

You can expect to hear back within 24-48 hours. If approved, we'll send you your plan details and credits to start hunting leads right away.

Track your status anytime:
{{appUrl}}/pending-approval

The Lead Hunter Club team`,
    variables: {
      name: data.name,
      appUrl: data.appUrl,
    },
    cta: {
      text: 'Check Status',
      url: `${data.appUrl}/pending-approval`,
    },
  })
}

// 6. Support Ticket Reply
export async function renderTicketReply(data: TicketReplyData) {
  return resolveDynamicTemplate({
    templateId: 'tpl-auto-ticket-reply',
    fallbackSubject: `Re: {{ticketSubject}}`,
    fallbackBody: `Hi {{name}},

Regarding your support request "{{ticketSubject}}":

{{replyBody}}

You can open and reply to this ticket directly here:
{{appUrl}}/support

Best regards,
Lead Hunter Club Support`,
    variables: {
      name: data.name,
      ticketSubject: data.ticketSubject,
      replyBody: data.replyBody,
      appUrl: data.appUrl,
    },
    cta: {
      text: 'Open Support Ticket',
      url: `${data.appUrl}/support`,
    },
  })
}

// 7. Low Credits Alert
export async function renderLowCreditsNudge(data: LowCreditsData) {
  return resolveDynamicTemplate({
    templateId: 'tpl-auto-low-credits',
    fallbackSubject: `Running low on credits ({{credits}} left) — Lead Hunter Club`,
    fallbackBody: `Hi {{name}},

You currently have {{credits}} credit(s) remaining in your account. Fresh client opportunities are being captured around the clock.

To avoid pausing your client hunting pipeline, you can top up credits instantly or upgrade to an unlimited tier:
• Refill credits: {{appUrl}}/refill
• View plans: {{appUrl}}/pricing

Happy hunting,
The Lead Hunter Club Team`,
    variables: {
      name: data.name || 'Hunter',
      credits: data.credits,
      appUrl: data.appUrl,
    },
    cta: {
      text: 'Top Up Credits',
      url: `${data.appUrl}/refill`,
    },
  })
}

// 8. Subscription Renewal Notice
export async function renderRenewalReminder(data: RenewalReminderData) {
  return resolveDynamicTemplate({
    templateId: 'tpl-auto-renewal-reminder',
    fallbackSubject: `Your Lead Hunter {{plan}} subscription renews in {{daysRemaining}} days`,
    fallbackBody: `Hi {{name}},

This is a quick reminder that your {{plan}} subscription is scheduled to renew in {{daysRemaining}} days (on {{renewalDate}}).

Your unused monthly credits will automatically roll over according to your plan rules so you never lose what you've earned.

Manage your account & billing:
{{appUrl}}/settings

Best,
The Lead Hunter Club Team`,
    variables: {
      name: data.name || 'Hunter',
      plan: data.plan,
      daysRemaining: data.daysRemaining,
      renewalDate: data.renewalDate,
      appUrl: data.appUrl,
    },
    cta: {
      text: 'Manage Account & Billing',
      url: `${data.appUrl}/settings`,
    },
  })
}

// 9. Email Verification Link
export async function renderEmailVerification(data: EmailVerificationData) {
  return resolveDynamicTemplate({
    templateId: 'tpl-auto-email-verification',
    fallbackSubject: `Verify your email address — Lead Hunter Club`,
    fallbackBody: `Hi {{name}},

Thanks for signing up for Lead Hunter Club! To secure your account and start finding high-converting leads, please verify your email address by clicking the link below:

{{verificationUrl}}

This verification link will expire in 24 hours.

If you did not create an account, you can safely ignore this email.

The Lead Hunter Club Team`,
    variables: {
      name: data.name || 'Hunter',
      verificationUrl: data.verificationUrl,
      appUrl: data.appUrl,
    },
    cta: {
      text: 'Verify Email Address',
      url: data.verificationUrl,
    },
  })
}

// 10. Newsletter Double Opt-In
export function renderNewsletterConfirmation(data: NewsletterConfirmationData) {
  const subject = `Confirm your subscription — Lead Hunter Club`
  const text = `Hi there,\n\nThanks for subscribing to the Lead Hunter Club newsletter! Please confirm your subscription by clicking the link below:\n\n${data.confirmUrl}\n\nIf you didn't request this, you can ignore this email.\n\n${data.appUrl}`
  const html = wrapHtml(`
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Thanks for subscribing to the <strong style="color:#fff">Lead Hunter Club</strong> newsletter!</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Please confirm your subscription by clicking the button below. This ensures we only send updates to people who want them.</p>
    <a href="${data.confirmUrl}" style="display:inline-block;margin:8px 0 16px;padding:12px 28px;background:#dc3b4c;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">Confirm Subscription</a>
    <p style="margin:16px 0;font-size:13px;color:#888;line-height:1.6">If you didn't request this, you can safely ignore this email.</p>
  `)
  return { subject, text, html }
}

// 11. Newsletter Broadcast
export function renderNewsletter(data: NewsletterData) {
  const subject = data.subject
  const text = `${data.bodyText}\n\n---\nYou're receiving this because you subscribed to the Lead Hunter Club newsletter.\nUnsubscribe: ${data.unsubscribeUrl}`
  const html = wrapHtml(`
    ${data.bodyHtml}
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0" />
    <p style="margin:0 0 8px;font-size:12px;color:#888;line-height:1.5">You're receiving this email because you subscribed to the Lead Hunter Club newsletter.</p>
    <a href="${data.unsubscribeUrl}" style="font-size:12px;color:#888;text-decoration:underline">Unsubscribe</a>
  `)
  return { subject, text, html }
}

// 12. Manual Broadcast Announcement
export function renderBroadcastAnnouncement(data: BroadcastData) {
  const subject = data.subject
  const text = `${data.messageText}\n\n---\nLead Hunter Club\nVisit platform: ${data.appUrl}/dashboard`
  const html = wrapHtml(`
    <h2 style="margin:16px 0 16px;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em">${data.subject}</h2>
    <div style="font-size:15px;color:#ccc;line-height:1.7;margin:16px 0">
      ${data.messageHtml}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 12px">
      <tr>
        <td align="center" style="border-radius:10px;background:#dc3b4c">
          <a href="${data.appUrl}/dashboard" target="_blank" style="display:inline-block;padding:12px 28px;background:#dc3b4c;color:#ffffff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">Open Lead Hunter Dashboard</a>
        </td>
      </tr>
    </table>
  `)
  return { subject, text, html }
}
