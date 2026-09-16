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

interface TemplateData {
  name: string
  appUrl: string
}

interface ApprovedData extends TemplateData {
  plan: string
  credits: number
}

interface RejectedData extends TemplateData {}

interface SuspendedData extends TemplateData {}

interface ApplicationReceivedData extends TemplateData {}

interface TicketReplyData extends TemplateData {
  ticketSubject: string
  replyBody: string
}

export function renderApproved(data: ApprovedData) {
  const subject = `Welcome to Lead Hunter Club — You've been approved!`
  const text = `Hi ${data.name},\n\nGreat news! Your application has been approved with the ${data.plan} plan, including ${data.credits} coins.\n\nYou can now log in and start hunting leads.\n\n${data.appUrl}/dashboard`
  const html = wrapHtml(`
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Hi ${data.name},</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Great news! Your application has been approved with the <strong style="color:#fff">${data.plan}</strong> plan, including <strong style="color:#fff">${data.credits} coins</strong>.</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">You can now log in and start hunting leads.</p>
    <a href="${data.appUrl}/dashboard" style="display:inline-block;margin:8px 0 16px;padding:12px 28px;background:#dc3b4c;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">Go to Dashboard</a>
  `)
  return { subject, text, html }
}

export function renderRejected(data: RejectedData) {
  const subject = `Update on your Lead Hunter Club application`
  const text = `Hi ${data.name},\n\nThank you for your interest in Lead Hunter Club. Unfortunately, we are unable to approve your application at this time, as it didn't meet our current criteria.\n\nWe're happy to review again if your circumstances change. If you have questions, please reach out to our support team.\n\n${data.appUrl}/support`
  const html = wrapHtml(`
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Hi ${data.name},</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Thank you for your interest in Lead Hunter Club. Unfortunately, we are unable to approve your application at this time, as it didn't meet our current criteria.</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">We're happy to review again if your circumstances change. If you have questions, our support team is here to help.</p>
    <a href="${data.appUrl}/support" style="display:inline-block;margin:8px 0 16px;padding:12px 28px;background:#dc3b4c;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">Contact Support</a>
  `)
  return { subject, text, html }
}

export function renderSuspended(data: SuspendedData) {
  const subject = `Lead Hunter Club — Account suspended`
  const text = `Hi ${data.name},\n\nYour account has been suspended. If you believe this was done in error, please contact support.\n\n${data.appUrl}`
  const html = wrapHtml(`
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Hi ${data.name},</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Your account has been suspended. If you believe this was done in error, please contact support.</p>
  `)
  return { subject, text, html }
}

export function renderApplicationReceived(data: ApplicationReceivedData) {
  const subject = `Application received — Lead Hunter Club`
  const text = `Hi ${data.name},\n\nWe've received your application. Our team will review it shortly and you'll hear back from us soon.\n\nIn the meantime, feel free to check your application status.\n\n${data.appUrl}/pending-approval`
  const html = wrapHtml(`
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Hi ${data.name},</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">We've received your application. Our team will review it shortly and you'll hear back from us soon.</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">In the meantime, feel free to check your application status.</p>
    <a href="${data.appUrl}/pending-approval" style="display:inline-block;margin:8px 0 16px;padding:12px 28px;background:#dc3b4c;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">Check Status</a>
  `)
  return { subject, text, html }
}

export function renderOnboardingComplete(data: ApplicationReceivedData) {
  const subject = `We're reviewing your application — Lead Hunter Club`
  const text = `Hi ${data.name},\n\nThanks for completing your profile! We've received everything and our team is now reviewing your application.\n\nYou can expect to hear back within 24-48 hours. If approved, we'll send you your plan details and credits to start hunting leads right away.\n\nTrack your status anytime: ${data.appUrl}/pending-approval\n\nThe Lead Hunter Club team`
  const html = wrapHtml(`
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Hi ${data.name},</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Thanks for completing your profile! We've received everything and our team is now reviewing your application.</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">You can expect to hear back within <strong style="color:#fff">24-48 hours</strong>. If approved, we'll send your plan details and credits to start hunting leads right away.</p>
    <a href="${data.appUrl}/pending-approval" style="display:inline-block;margin:8px 0 16px;padding:12px 28px;background:#dc3b4c;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">Check Status</a>
  `)
  return { subject, text, html }
}

interface TicketReplyData extends TemplateData {
  ticketSubject: string
  replyBody: string
}

export function renderTicketReply(data: TicketReplyData) {
  const subject = `Re: ${data.ticketSubject}`
  const text = `Hi ${data.name},\n\nRegarding your support request "${data.ticketSubject}":\n\n${data.replyBody}\n\nOpen your ticket here: ${data.appUrl}/support`
  const html = wrapHtml(`
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Hi ${data.name},</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Regarding your support request &quot;<strong style="color:#fff">${data.ticketSubject}</strong>&quot;:</p>
    <div style="margin:16px 0;padding:16px 20px;background:rgba(255,255,255,0.04);border-left:3px solid #dc3b4c;border-radius:8px;color:#e5e5e5;font-size:14px;line-height:1.6;white-space:pre-wrap">${data.replyBody.replace(/</g, '&lt;')}</div>
    <a href="${data.appUrl}/support" style="display:inline-block;margin:8px 0 16px;padding:12px 28px;background:#dc3b4c;color:#fff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">Open Ticket</a>
  `)
  return { subject, text, html }
}

interface NewsletterConfirmationData extends TemplateData {
  confirmUrl: string
}

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

interface NewsletterData {
  subject: string
  bodyHtml: string
  bodyText: string
  unsubscribeUrl: string
}

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

export interface EmailVerificationData {
  name?: string
  email: string
  verificationUrl: string
  appUrl: string
}

export function renderEmailVerification(data: EmailVerificationData) {
  const greeting = data.name ? `Hi ${data.name},` : 'Welcome to Lead Hunter Club,'
  const subject = `Verify your email address — Lead Hunter Club`
  const text = `${greeting}\n\nThanks for signing up for Lead Hunter Club! Please verify your email address by clicking the link below:\n\n${data.verificationUrl}\n\nThis verification link will expire in 24 hours.\n\nIf you did not create an account, you can safely ignore this email.\n\n${data.appUrl}`
  const html = wrapHtml(`
    <h2 style="margin:16px 0 8px;font-size:18px;font-weight:600;color:#ffffff;letter-spacing:-0.01em">Verify your email address</h2>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">${greeting}</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">Thanks for signing up for <strong style="color:#ffffff">Lead Hunter Club</strong>. To secure your account and start finding high-converting leads, please verify your email address.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
      <tr>
        <td align="center" style="border-radius:10px;background:#dc3b4c">
          <a href="${data.verificationUrl}" target="_blank" style="display:inline-block;padding:12px 32px;background:#dc3b4c;color:#ffffff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.01em">Verify Email Address</a>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 8px;font-size:13px;color:#888;line-height:1.6">Button not working? Copy and paste this link into your browser:</p>
    <p style="margin:0 0 16px;font-size:12px;color:#666;word-break:break-all;line-height:1.5">
      <a href="${data.verificationUrl}" style="color:#dc3b4c;text-decoration:underline">${data.verificationUrl}</a>
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#777;line-height:1.5">This verification link will expire in 24 hours. If you did not create an account with Lead Hunter Club, no further action is required.</p>
  `)
  return { subject, text, html }
}

export interface LowCreditsData {
  name: string
  credits: number
  appUrl: string
}

export function renderLowCreditsNudge(data: LowCreditsData) {
  const greeting = data.name ? `Hi ${data.name},` : 'Hello Hunter,'
  const subject = `Running low on credits (${data.credits} left) — Lead Hunter Club`
  const text = `${greeting}\n\nYou only have ${data.credits} credit${data.credits === 1 ? '' : 's'} remaining in your account.\n\nDon't let your outreach pipeline pause. Refill your credits or upgrade your plan to keep unlocking verified client leads.\n\nRefill credits: ${data.appUrl}/refill\nView plans: ${data.appUrl}/pricing`
  const html = wrapHtml(`
    <h2 style="margin:16px 0 8px;font-size:18px;font-weight:600;color:#ffffff;letter-spacing:-0.01em">Your credit balance is low</h2>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">${greeting}</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">
      You currently have <strong style="color:#f59e0b;font-size:16px">${data.credits} credit${data.credits === 1 ? '' : 's'} remaining</strong>. Fresh client opportunities are being captured around the clock.
    </p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">
      To avoid pausing your client hunting pipeline, you can top up credits instantly or upgrade to an unlimited tier.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
      <tr>
        <td align="center" style="border-radius:10px;background:#dc3b4c">
          <a href="${data.appUrl}/refill" target="_blank" style="display:inline-block;padding:12px 28px;background:#dc3b4c;color:#ffffff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">Top Up Credits</a>
        </td>
        <td style="width:12px"></td>
        <td align="center" style="border-radius:10px;background:rgba(255,255,255,0.08)">
          <a href="${data.appUrl}/pricing" target="_blank" style="display:inline-block;padding:12px 24px;color:#ffffff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:500">View Plans</a>
        </td>
      </tr>
    </table>
  `)
  return { subject, text, html }
}

export interface RenewalReminderData {
  name: string
  plan: string
  daysRemaining: number
  renewalDate: string
  appUrl: string
}

export function renderRenewalReminder(data: RenewalReminderData) {
  const greeting = data.name ? `Hi ${data.name},` : 'Hello Hunter,'
  const subject = `Your Lead Hunter ${data.plan} subscription renews in ${data.daysRemaining} days`
  const text = `${greeting}\n\nThis is a quick reminder that your ${data.plan} plan will renew on ${data.renewalDate}.\n\nYour unused monthly credits will automatically roll over according to your plan rules so you never lose what you've earned.\n\nManage your subscription: ${data.appUrl}/settings`
  const html = wrapHtml(`
    <h2 style="margin:16px 0 8px;font-size:18px;font-weight:600;color:#ffffff;letter-spacing:-0.01em">Upcoming Subscription Renewal</h2>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">${greeting}</p>
    <p style="margin:16px 0;font-size:15px;color:#ccc;line-height:1.6">
      Your <strong style="color:#ffffff">${data.plan}</strong> subscription is scheduled to renew in <strong style="color:#10b981">${data.daysRemaining} days</strong> (on ${data.renewalDate}).
    </p>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin:20px 0">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#ffffff">✓ Unused Credits Rollover Protection</p>
      <p style="margin:0;font-size:13px;color:#aaa;line-height:1.5">
        Any unused credits remaining on your account will roll over seamlessly with your next cycle.
      </p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
      <tr>
        <td align="center" style="border-radius:10px;background:#dc3b4c">
          <a href="${data.appUrl}/settings" target="_blank" style="display:inline-block;padding:12px 28px;background:#dc3b4c;color:#ffffff;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">Manage Account & Billing</a>
        </td>
      </tr>
    </table>
  `)
  return { subject, text, html }
}

export interface BroadcastData {
  subject: string
  messageHtml: string
  messageText: string
  appUrl: string
}

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


