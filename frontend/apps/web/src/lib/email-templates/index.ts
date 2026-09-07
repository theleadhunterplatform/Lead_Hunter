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
