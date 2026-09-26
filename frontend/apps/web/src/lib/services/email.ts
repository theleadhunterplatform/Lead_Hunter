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

export interface EmailResult {
  id: string
  success: boolean
  error?: string
  provider?: 'smtp' | 'resend' | 'mock'
}

const SMTP_HOST = process.env.SMTP_HOST?.trim()
const SMTP_PORT = parseInt(process.env.SMTP_PORT?.trim() || '587', 10)
const SMTP_USER = process.env.SMTP_USER?.trim()
const SMTP_PASS = process.env.SMTP_PASS?.trim()
const SMTP_SECURE = process.env.SMTP_SECURE?.trim() === 'true' || SMTP_PORT === 465

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim()
const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || (SMTP_USER ? `Lead Hunter Club <${SMTP_USER}>` : 'Lead Hunter Club <noreply@leadhunterclub.com>')
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://leadhunterclub.com'
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.VERCEL

function logDev(...args: unknown[]) {
  if (!IS_PRODUCTION) {
    console.log('[Email Service]', ...args)
  }
}

async function logEmail(type: string, to: string, subject: string, status: string, error?: string) {
  try {
    await db.emailLog.create({
      data: { type, to, subject, status, error: error || null },
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
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
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
  let lastError: string | null = null

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
      return { id: info.messageId || 'sent-smtp', success: true, provider: 'smtp' }
    } catch (smtpErr) {
      cachedTransporter = null
      lastError = smtpErr instanceof Error ? smtpErr.message : String(smtpErr)
      console.error('[Email Service] Custom SMTP failed:', smtpErr)
      if (!RESEND_API_KEY) {
        return {
          id: 'error',
          success: false,
          error: `SMTP error: ${lastError}`,
          provider: 'smtp',
        }
      }
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
        return {
          id: 'error',
          success: false,
          error: error.message || 'Resend API error',
          provider: 'resend',
        }
      }

      logDev(`Sent email via Resend to ${to}: ${data?.id}`)
      return { id: data?.id || 'sent-resend', success: true, provider: 'resend' }
    } catch (resendErr) {
      const resendMsg = resendErr instanceof Error ? resendErr.message : String(resendErr)
      console.error('[Email Service] Resend API exception:', resendErr)
      return {
        id: 'error',
        success: false,
        error: `Resend exception: ${resendMsg}`,
        provider: 'resend',
      }
    }
  }

  // 3. Fallback / Missing credentials check
  const missingVars: string[] = []
  if (!SMTP_HOST) missingVars.push('SMTP_HOST')
  if (!SMTP_USER) missingVars.push('SMTP_USER')
  if (!SMTP_PASS) missingVars.push('SMTP_PASS')
  const missingDetail = missingVars.length > 0 ? `Missing variables: ${missingVars.join(', ')}` : 'SMTP authentication unconfigured'

  if (IS_PRODUCTION) {
    const errorMsg = lastError ? `SMTP error: ${lastError}` : `Email service unconfigured in production (${missingDetail}).`
    console.error(`[Email Service] Cannot send email: ${errorMsg}`)
    return {
      id: 'error',
      success: false,
      error: errorMsg,
      provider: 'mock',
    }
  }

  logDev(`[DEV MOCK EMAIL] To: ${to} | Subject: "${subject}" | (${missingDetail})`)
  return {
    id: 'mock-sent',
    success: false,
    error: `Development mock mode: Live email not dispatched (${missingDetail}). Set SMTP credentials to enable live sending.`,
    provider: 'mock',
  }
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
    await logEmail(type, to, subject, result.success ? 'SENT' : 'FAILED', result.error)
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Email Service] Failed to send "${subject}" to ${to}:`, error)
    await logEmail(type, to, subject, 'FAILED', message)
    return { id: 'error', success: false, error: message, provider: 'mock' }
  }
}

export const emailService = {
  // Flow 1: Application Received
  async sendApplicationReceived(user: { name: string; email: string }) {
    const { subject, text, html } = await renderApplicationReceived({ name: user.name, appUrl: APP_URL })
    return send('application_received', user.email, subject, text, { html })
  },

  async sendOnboardingComplete(user: { name: string; email: string }) {
    const { subject, text, html } = await renderOnboardingComplete({ name: user.name, appUrl: APP_URL })
    return send('onboarding_complete', user.email, subject, text, { html })
  },

  // Flow 2: Account Approved
  async sendApproved(user: { name: string; email: string }, plan: string, credits: number) {
    const { subject, text, html } = await renderApproved({
      name: user.name,
      plan,
      credits,
      appUrl: APP_URL,
    })
    return send('approved', user.email, subject, text, { html })
  },

  async sendRejected(user: { name: string; email: string }) {
    const { subject, text, html } = await renderRejected({ name: user.name, appUrl: APP_URL })
    return send('rejected', user.email, subject, text, { html })
  },

  async sendSuspended(user: { name: string; email: string }) {
    const { subject, text, html } = await renderSuspended({ name: user.name, appUrl: APP_URL })
    return send('suspended', user.email, subject, text, { html })
  },

  // Flow 3: Low Credits Nudge (<= 2 credits remaining)
  async sendLowCreditsNudge(user: { name?: string; email: string }, credits: number) {
    const { subject, text, html } = await renderLowCreditsNudge({
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
    const { subject, text, html } = await renderRenewalReminder({
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
    const { subject, text, html } = await renderTicketReply({
      name: user.name,
      appUrl: APP_URL,
      ticketSubject: user.ticketSubject,
      replyBody: user.replyBody,
    })
    return send('ticket_reply', user.email, subject, text, { html })
  },

  async sendEmailVerification(user: { name?: string; email: string }, verificationUrl: string) {
    const { subject, text, html } = await renderEmailVerification({
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
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    if (recipients.length === 0) {
      return { sent: 0, failed: 0, errors: [] }
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
    const errors: string[] = []
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
        if (res.success) {
          sent++
        } else {
          failed++
          if (res.error && !errors.includes(res.error)) {
            errors.push(res.error)
          }
        }
      }
    }

    return { sent, failed, errors }
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
    const missing: string[] = []
    if (!SMTP_HOST) missing.push('SMTP_HOST')
    if (!SMTP_USER) missing.push('SMTP_USER')
    if (!SMTP_PASS) missing.push('SMTP_PASS')

    const smtp = getSmtpTransporter()
    if (smtp) {
      try {
        await smtp.verify()
        return {
          configured: true,
          provider: 'smtp',
          working: true,
          message: `Custom SMTP verified successfully (${SMTP_HOST}:${SMTP_PORT}, user: ${SMTP_USER})`,
        }
      } catch (err: unknown) {
        cachedTransporter = null
        const errorMsg = err instanceof Error ? err.message : 'SMTP verification failed'
        return {
          configured: true,
          provider: 'smtp',
          working: false,
          message: `SMTP connection error (${SMTP_HOST}:${SMTP_PORT}): ${errorMsg}`,
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
      working: false,
      message: `Mailer not configured. Missing variables: ${missing.join(', ') || 'No credentials'}. Set them in Vercel and redeploy.`,
    }
  },

  /**
   * Sends a newsletter broadcast to all active subscribers.
   */
  async sendBroadcast(subject: string, bodyHtml: string, bodyText: string) {
    const subscribers = await db.newsletterSubscriber.findMany({
      where: { status: 'SUBSCRIBED' },
      select: { email: true },
    })
    let sent = 0
    let failed = 0
    for (const sub of subscribers) {
      const res = await this.sendNewsletter(sub.email, subject, bodyHtml, bodyText)
      if (res.success) {
        sent++
      } else {
        failed++
      }
    }
    return { sent, failed, total: subscribers.length }
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
