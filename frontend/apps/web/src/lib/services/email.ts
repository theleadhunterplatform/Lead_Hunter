import { db } from '@/lib/db'
import nodemailer from 'nodemailer'
import {
  renderApproved,
  renderRejected,
  renderSuspended,
  renderApplicationReceived,
  renderTicketReply,
  renderOnboardingComplete,
  renderNewsletterConfirmation,
  renderNewsletter,
  renderEmailVerification,
  renderLowCreditsNudge,
  renderRenewalReminder,
  renderBroadcastAnnouncement,
} from '@/lib/email-templates'

interface SendOptions {
  html?: string
}

interface EmailResult {
  id: string
}

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'Lead Hunter Club <noreply@leadhunterclub.com>'
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadhunterclub.com'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function logDev(...args: unknown[]) {
  if (!IS_PRODUCTION) {
    console.log('[Email Service]', ...args)
  }
}

async function logEmail(type: string, to: string, subject: string, status: string, error?: string) {
  try {
    await db.emailLog.create({
      data: { type, to, subject, status, error },
    })
  } catch (logError) {
    console.error('[Email Service] Failed to write EmailLog:', logError)
  }
}

let cachedTransporter: nodemailer.Transporter | null = null

function getSmtpTransporter(): nodemailer.Transporter | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null
  }
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    })
  }
  return cachedTransporter
}

async function sendViaHybridTransport(
  to: string,
  subject: string,
  body: string,
  opts?: SendOptions,
): Promise<EmailResult> {
  const smtp = getSmtpTransporter()

  // 1. Primary Transport: Custom Domain SMTP (Nodemailer)
  if (smtp) {
    try {
      const info = await smtp.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        text: body,
        html: opts?.html || body,
      })
      logDev(`Sent email via Custom SMTP to ${to}: ${info.messageId}`)
      return { id: info.messageId || 'sent-smtp' }
    } catch (smtpErr) {
      console.error('[Email Service] Custom SMTP failed, falling back to Resend:', smtpErr)
    }
  }

  // 2. Secondary Transport: Resend API
  if (RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(RESEND_API_KEY)

      const { data, error } = await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject,
        text: body,
        html: opts?.html || body,
      })

      if (error) {
        console.error('[Email Service] Resend API error:', error)
        return { id: 'error' }
      }

      logDev(`Sent email via Resend to ${to}: ${data?.id}`)
      return { id: data?.id || 'sent-resend' }
    } catch (resendErr) {
      console.error('[Email Service] Resend API exception:', resendErr)
      return { id: 'error' }
    }
  }

  // 3. Fallback for development without credentials
  logDev(`[DEV MOCK EMAIL] To: ${to} | Subject: "${subject}" | (No SMTP/Resend configured)`)
  return { id: 'mock-sent' }
}

async function send(
  type: string,
  to: string,
  subject: string,
  body: string,
  opts?: SendOptions,
): Promise<EmailResult> {
  try {
    const result = await sendViaHybridTransport(to, subject, body, opts)
    await logEmail(type, to, subject, result.id === 'error' ? 'FAILED' : 'SENT')
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Email Service] Failed to send "${subject}" to ${to}:`, error)
    await logEmail(type, to, subject, 'FAILED', message)
    return { id: 'error' }
  }
}

export const emailService = {
  // Flow 1: Application Received
  async sendApplicationReceived(user: { name: string; email: string }) {
    const { subject, text, html } = renderApplicationReceived({ name: user.name, appUrl: APP_URL })
    return send('application_received', user.email, subject, text, { html })
  },

  async sendOnboardingComplete(user: { name: string; email: string }) {
    const { subject, text, html } = renderOnboardingComplete({ name: user.name, appUrl: APP_URL })
    return send('onboarding_complete', user.email, subject, text, { html })
  },

  // Flow 2: Account Approved
  async sendApproved(user: { name: string; email: string }, plan: string, credits: number) {
    const { subject, text, html } = renderApproved({
      name: user.name,
      plan,
      credits,
      appUrl: APP_URL,
    })
    return send('approved', user.email, subject, text, { html })
  },

  async sendRejected(user: { name: string; email: string }) {
    const { subject, text, html } = renderRejected({ name: user.name, appUrl: APP_URL })
    return send('rejected', user.email, subject, text, { html })
  },

  async sendSuspended(user: { name: string; email: string }) {
    const { subject, text, html } = renderSuspended({ name: user.name, appUrl: APP_URL })
    return send('suspended', user.email, subject, text, { html })
  },

  // Flow 3: Low Credits Nudge (<= 2 credits remaining)
  async sendLowCreditsNudge(user: { name?: string; email: string }, credits: number) {
    const { subject, text, html } = renderLowCreditsNudge({
      name: user.name || '',
      credits,
      appUrl: APP_URL,
    })
    return send('low_credits', user.email, subject, text, { html })
  },

  // Flow 4: Renewal Reminder (3 days before monthly renewal)
  async sendRenewalNotice(
    user: { name?: string; email: string },
    daysRemaining: number,
    plan: string,
    renewalDate: string,
  ) {
    const { subject, text, html } = renderRenewalReminder({
      name: user.name || '',
      plan,
      daysRemaining,
      renewalDate,
      appUrl: APP_URL,
    })
    return send('renewal_reminder', user.email, subject, text, { html })
  },

  async sendTicketReply(user: {
    name: string
    email: string
    ticketSubject: string
    replyBody: string
    ticketUrl: string
  }) {
    const { subject, text, html } = renderTicketReply({
      name: user.name,
      appUrl: APP_URL,
      ticketSubject: user.ticketSubject,
      replyBody: user.replyBody,
    })
    return send('ticket_reply', user.email, subject, text, { html })
  },

  async sendEmailVerification(user: { name?: string; email: string }, verificationUrl: string) {
    const { subject, text, html } = renderEmailVerification({
      name: user.name,
      email: user.email,
      verificationUrl,
      appUrl: APP_URL,
    })
    return send('email_verification', user.email, subject, text, { html })
  },

  async notifyAdmin(type: string, data: Record<string, unknown>) {
    if (!ADMIN_NOTIFICATION_EMAIL) {
      logDev(`Admin notification skipped (no ADMIN_NOTIFICATION_EMAIL): type=${type}`)
      await logEmail(type, '(admin)', `[Lead Hunter Club] ${type}`, 'SKIPPED', 'No ADMIN_NOTIFICATION_EMAIL')
      return { id: 'skipped-no-admin-email' }
    }

    const subject = `[Lead Hunter Club] ${type}`
    const lines = Object.entries(data)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    const text = `Admin Notification\n\nType: ${type}\n\n${lines}\n\nView at: ${APP_URL}/admin/users`

    return send('admin_notification', ADMIN_NOTIFICATION_EMAIL, subject, text)
  },

  /**
   * Dispatches a broadcast announcement to registered platform members in safe chunks of 15.
   */
  async sendBroadcastToUsers(
    recipients: Array<{ name?: string | null; email: string }>,
    subject: string,
    contentHtml: string,
    contentText: string,
  ): Promise<{ sent: number; failed: number }> {
    if (recipients.length === 0) {
      return { sent: 0, failed: 0 }
    }

    const { subject: renderedSubject, text: defaultText, html: defaultHtml } =
      renderBroadcastAnnouncement({
        subject,
        messageHtml: contentHtml,
        messageText: contentText,
        appUrl: APP_URL,
      })

    let sent = 0
    let failed = 0
    const CHUNK_SIZE = 15

    for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
      const chunk = recipients.slice(i, i + CHUNK_SIZE)
      const results = await Promise.all(
        chunk.map(async (user) => {
          return send('broadcast', user.email, renderedSubject, defaultText, {
            html: defaultHtml,
          })
        }),
      )
      for (const res of results) {
        if (res.id !== 'error') {
          sent++
        } else {
          failed++
        }
      }
    }

    return { sent, failed }
  },

  /**
   * Diagnostic check for SMTP & Email provider health.
   */
  async verifySmtpConnection(): Promise<{
    configured: boolean
    provider: 'smtp' | 'resend' | 'mock'
    working: boolean
    message: string
  }> {
    const smtp = getSmtpTransporter()
    if (smtp) {
      try {
        await smtp.verify()
        return {
          configured: true,
          provider: 'smtp',
          working: true,
          message: `Custom SMTP verified successfully (${SMTP_HOST}:${SMTP_PORT})`,
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'SMTP verification failed'
        return {
          configured: true,
          provider: 'smtp',
          working: false,
          message: `SMTP connection error: ${errorMsg}`,
        }
      }
    }

    if (RESEND_API_KEY) {
      return {
        configured: true,
        provider: 'resend',
        working: true,
        message: 'Resend API key configured and active',
      }
    }

    return {
      configured: false,
      provider: 'mock',
      working: true,
      message: 'Running in development mock mode. Add SMTP or Resend credentials for live dispatching.',
    }
  },

  async sendNewsletterConfirmation(email: string, confirmUrl: string) {
    const { subject, text, html } = renderNewsletterConfirmation({
      name: '',
      appUrl: APP_URL,
      confirmUrl,
    })
    return send('newsletter_confirmation', email, subject, text, { html })
  },

  async sendNewsletter(to: string, subject: string, bodyHtml: string, bodyText: string, unsubscribeUrl?: string) {
    const { subject: s, text, html } = renderNewsletter({
      subject,
      bodyHtml,
      bodyText,
      unsubscribeUrl: unsubscribeUrl || `${APP_URL}/newsletter/unsubscribe`,
    })
    return send('newsletter', to, s, text, { html })
  },
}
