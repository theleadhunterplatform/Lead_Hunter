import { db } from '@/lib/db'
import {
  renderApproved,
  renderRejected,
  renderSuspended,
  renderApplicationReceived,
  renderTicketReply,
  renderOnboardingComplete,
  renderNewsletterConfirmation,
  renderNewsletter,
} from '@/lib/email-templates'
import { randomUUID } from 'crypto'

interface SendOptions {
  html?: string
}

interface EmailResult {
  id: string
}

const RESEND_API_KEY = process.env.RESEND_API_KEY
const BREVO_API_KEY = process.env.BREVO_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@leadhunterclub.com'
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Lead Hunter Club'
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

async function sendWithResend(
  to: string,
  subject: string,
  body: string,
  opts?: SendOptions,
): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    if (IS_PRODUCTION) {
      throw new Error('RESEND_API_KEY is not configured. Email sending is required in production.')
    }
    logDev(`Email skipped (no RESEND_API_KEY): to=${to}, subject="${subject}"`)
    return { id: 'skipped-no-api-key' }
  }

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
    console.error('[Email Service] Resend error:', error)
    return { id: 'error' }
  }

  return { id: data?.id || 'sent' }
}

async function send(
  type: string,
  to: string,
  subject: string,
  body: string,
  opts?: SendOptions,
): Promise<EmailResult> {
  try {
    const result = await sendWithResend(to, subject, body, opts)
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

  async sendApplicationReceived(user: { name: string; email: string }) {
    const { subject, text, html } = renderApplicationReceived({ name: user.name, appUrl: APP_URL })
    return sendWithResend(user.email, subject, text, { html })
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
    return sendWithResend(user.email, subject, text, { html })
  },

  async sendOnboardingComplete(user: { name: string; email: string }) {
    const { subject, text, html } = renderOnboardingComplete({ name: user.name, appUrl: APP_URL })
    return send('onboarding_complete', user.email, subject, text, { html })
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

  async sendNewsletterConfirmation(email: string, confirmUrl: string) {
    const { subject, text, html } = renderNewsletterConfirmation({
      name: '',
      appUrl: APP_URL,
      confirmUrl,
    })
    return sendNewsletterEmail('newsletter_confirmation', email, subject, text, html)
  },

  async sendNewsletter(to: string, subject: string, bodyHtml: string, bodyText: string, unsubscribeUrl?: string) {
    const { subject: s, text, html } = renderNewsletter({
      subject,
      bodyHtml,
      bodyText,
      unsubscribeUrl: unsubscribeUrl || `${APP_URL}/newsletter/unsubscribe`,
    })
    return sendNewsletterEmail('newsletter', to, s, text, html)
  },

  async sendBroadcast(subject: string, bodyHtml: string, bodyText: string) {
    const subscribers = await db.newsletterSubscriber.findMany({
      where: { status: 'SUBSCRIBED' },
      select: { email: true, unsubscribeToken: true },
    })

    if (subscribers.length === 0) {
      logDev(`Broadcast skipped (no subscribers): subject="${subject}"`)
      return { id: 'skipped-no-subscribers', sent: 0 }
    }

    let sent = 0
    for (const sub of subscribers) {
      const unsubscribeUrl = `${APP_URL}/newsletter/unsubscribe?token=${sub.unsubscribeToken}`
      const { subject: s, text, html } = renderNewsletter({
        subject,
        bodyHtml,
        bodyText,
        unsubscribeUrl,
      })
      const result = await sendNewsletterEmail('newsletter_broadcast', sub.email, s, text, html, sub.unsubscribeToken)
      if (result.id !== 'error') sent++
    }
    return { id: 'broadcast', sent }
  },

  async unsubscribeSubscriber(email: string, token: string) {
    const sub = await db.newsletterSubscriber.findUnique({ where: { email } })
    if (!sub || sub.unsubscribeToken !== token) {
      return { ok: false, reason: 'invalid' }
    }
    await db.newsletterSubscriber.update({
      where: { id: sub.id },
      data: { status: 'UNSUBSCRIBED' },
    })
    return { ok: true }
  },
}

interface NewsletterSendOptions {
  html?: string
}

async function sendNewsletterEmail(
  type: 'newsletter' | 'newsletter_broadcast' | 'newsletter_confirmation',
  to: string,
  subject: string,
  text: string,
  html?: string,
  token?: string,
): Promise<EmailResult> {
  if (BREVO_API_KEY) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
        Accept: 'application/json',
      }
      if (token && type === 'newsletter_broadcast') {
        headers['List-Unsubscribe'] = `<${APP_URL}/newsletter/unsubscribe?token=${token}>`
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
      }
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sender: { name: BREVO_SENDER_NAME, email: EMAIL_FROM },
          to: [{ email: to }],
          subject,
          textContent: text,
          htmlContent: html || text,
          headers,
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        console.error(`[Email Service] Brevo error ${res.status}:`, body)
        await logEmail(type, to, subject, 'FAILED', `Brevo ${res.status}`)
        return { id: 'error' }
      }
      await logEmail(type, to, subject, 'SENT')
      return { id: 'brevo-sent' }
    } catch (error) {
      console.error('[Email Service] Brevo send failed:', error)
      await logEmail(type, to, subject, 'FAILED', error instanceof Error ? error.message : 'Brevo error')
      return { id: 'error' }
    }
  }

  if (IS_PRODUCTION) {
    const err = new Error('BREVO_API_KEY is not configured. Newsletter sending is required in production.')
    await logEmail(type, to, subject, 'FAILED', err.message)
    throw err
  }
  logDev(`Newsletter skipped (no BREVO_API_KEY): to=${to}, subject="${subject}"`)
  await logEmail(type, to, subject, 'SKIPPED', 'No BREVO_API_KEY')
  return { id: 'skipped-no-brevo-key' }
}
