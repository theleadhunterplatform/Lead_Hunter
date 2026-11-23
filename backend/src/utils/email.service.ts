import axios from 'axios';
import config from '../config';
import ErrorResponse from './error-response.utils';

export function isEmailConfigured(): boolean {
    return Boolean(
        config.email.resendApiKey ||
            (config.email.smtp.host && config.email.smtp.user && config.email.smtp.pass)
    );
}

async function sendViaResend(to: string, subject: string, html: string, text?: string) {
    await axios.post(
        'https://api.resend.com/emails',
        {
            from: config.email.from,
            to: [to],
            subject,
            html,
            text: text || html.replace(/<[^>]+>/g, ''),
        },
        {
            headers: {
                Authorization: `Bearer ${config.email.resendApiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        }
    );
}

async function sendViaSmtp(to: string, subject: string, html: string, text?: string) {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: {
            user: config.email.smtp.user,
            pass: config.email.smtp.pass,
        },
    });

    await transport.sendMail({
        from: config.email.from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ''),
    });
}

export async function sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
}): Promise<void> {
    if (!isEmailConfigured()) {
        throw new ErrorResponse(
            'Email is not configured. Set RESEND_API_KEY or SMTP_* variables on the server.',
            503
        );
    }

    try {
        if (config.email.resendApiKey) {
            await sendViaResend(options.to, options.subject, options.html, options.text);
            return;
        }
        await sendViaSmtp(options.to, options.subject, options.html, options.text);
    } catch (error: any) {
        console.error('[Email] Send failed:', error.response?.data || error.message);
        throw new ErrorResponse('Failed to send email. Check server email configuration.', 502);
    }
}

export function buildInviteEmail(name: string, email: string, tempPassword: string, loginUrl: string) {
    return {
        subject: 'You have been invited to Lead Hunter',
        html: `
            <p>Hi ${name},</p>
            <p>You have been invited to <strong>Lead Hunter</strong>.</p>
            <p><strong>Email:</strong> ${email}<br/>
            <strong>Temporary password:</strong> ${tempPassword}</p>
            <p>Sign in at <a href="${loginUrl}">${loginUrl}</a> — you will be asked to set a new password.</p>
        `,
    };
}

export function buildPasswordResetEmail(resetUrl: string) {
    return {
        subject: 'Reset your Lead Hunter password',
        html: `
            <p>You requested a password reset for Lead Hunter.</p>
            <p><a href="${resetUrl}">Click here to reset your password</a></p>
            <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
        `,
    };
}

export function buildPlanChangeEmail(
    name: string,
    planName: string,
    actionType: 'upgrade' | 'downgrade' | 'change',
    tokens: number,
    appUrl: string = 'https://www.theleadhunterclub.com'
) {
    const isUpgrade = actionType === 'upgrade';
    const isDowngrade = actionType === 'downgrade';

    const subject = isUpgrade
        ? `Your Lead Hunter plan has been upgraded to ${planName}!`
        : isDowngrade
        ? `Your Lead Hunter plan has been changed to ${planName}`
        : `Your Lead Hunter plan is now ${planName}`;

    return {
        subject,
        html: `
            <p>Hi ${name || 'there'},</p>
            <p>${
                isUpgrade
                    ? `Congratulations! Your account has been upgraded to the <strong>${planName}</strong> plan.`
                    : `This email confirms that your subscription has been changed to the <strong>${planName}</strong> plan.`
            }</p>
            <p>Your credit allowance is now <strong>${tokens}</strong> credits.</p>
            <p><a href="${appUrl}/leads">Click here to explore and claim new leads</a></p>
        `,
    };
}

export function buildTopupEmail(
    name: string,
    tokensAdded: number,
    totalTokens?: number,
    appUrl: string = 'https://www.theleadhunterclub.com'
) {
    return {
        subject: `Credits added: ${tokensAdded} credits topped up to your account!`,
        html: `
            <p>Hi ${name || 'there'},</p>
            <p>Your top-up of <strong>${tokensAdded}</strong> credit(s) has been successfully applied to your account.</p>
            ${totalTokens !== undefined ? `<p>Your new credit balance is: <strong>${totalTokens}</strong> credits.</p>` : ''}
            <p><a href="${appUrl}/leads">Claim new leads now</a></p>
        `,
    };
}

export interface LeadAlertEmailItem {
    id: string;
    title?: string | null;
    niche?: string | null;
    platform?: string | null;
    content?: string | null;
    keyword?: string | null;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatSnippet(content?: string | null, maxLen: number = 160): string {
    if (!content) return '';
    const clean = content.replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLen) return escapeHtml(clean);
    return escapeHtml(clean.slice(0, maxLen)) + '...';
}

export function buildLeadDropAlertEmail(
    userName: string,
    leads: LeadAlertEmailItem[],
    appUrlInput?: string,
    userEmail?: string
) {
    const rawUrl = appUrlInput || process.env.FRONTEND_URL || 'https://www.theleadhunterclub.com';
    const appUrl = (rawUrl.includes('vercel.app') ? 'https://www.theleadhunterclub.com' : rawUrl).replace(/\/+$/, '');
    const unsubUrl = userEmail
        ? `${appUrl}/alerts/unsubscribe?email=${encodeURIComponent(userEmail.trim())}`
        : `${appUrl}/settings`;
    const isSingle = leads.length === 1;
    const firstLead = leads[0];
    const firstLeadTitle =
        firstLead?.title?.trim() ||
        (firstLead?.niche ? `${firstLead.niche} Lead` : 'New Strategic Opportunity');

    const subject = isSingle
        ? `🔥 New Lead Alert: ${firstLeadTitle} | Lead Hunter`
        : `🔥 ${leads.length} New Verified Leads Just Approved | Lead Hunter`;

    const leadCardsHtml = leads
        .map((lead) => {
            const displayTitle =
                lead.title?.trim() ||
                (lead.niche ? `${lead.niche} Opportunity` : lead.keyword || 'Strategic Client Lead');
            const snippet = formatSnippet(lead.content);
            const leadUrl = `${appUrl}/leads?lead=${encodeURIComponent(lead.id)}`;

            return `
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; background-color: #141414; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="padding: 20px 22px;">
                  <div style="margin-bottom: 10px;">
                    <span style="display: inline-block; background-color: rgba(255, 184, 0, 0.12); color: #FFB800; border: 1px solid rgba(255, 184, 0, 0.28); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${escapeHtml(lead.niche || lead.keyword || 'Strategic Lead')}
                    </span>
                  </div>
                  <h3 style="color: #ffffff; font-size: 16px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.4;">
                    ${escapeHtml(displayTitle)}
                  </h3>
                  ${snippet ? `<p style="color: #cccccc; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">${snippet}</p>` : ''}
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="border-radius: 10px; background-color: #FFB800;">
                        <a href="${leadUrl}" style="display: inline-block; background-color: #FFB800; color: #0a0a0a; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 22px; border-radius: 10px;">
                          View &amp; Claim Lead
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>`;
        })
        .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #141414; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden;">
          <!-- Content Area -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h1 style="margin: 0 0 18px 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
                Lead Hunter Club
              </h1>
              
              <p style="color: #cccccc; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">
                Hi ${escapeHtml(userName || 'Hunter')},
              </p>
              
              <p style="color: #cccccc; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                <strong style="color: #ffffff;">${isSingle ? 'A new client requirement' : `${leads.length} new client requirements`}</strong> matching active market demand have just been reviewed and approved on Lead Hunter. Claim before competitors reach out.
              </p>

              <!-- Lead Cards -->
              ${leadCardsHtml}

              <!-- Bottom Feed Link & Sign-off -->
              <p style="margin: 24px 0 6px 0; font-size: 14px; color: #cccccc; line-height: 1.6;">
                Explore All Strategic Leads on Platform:<br>
                <a href="${appUrl}/leads" style="color: #FFB800; font-weight: 600; text-decoration: underline;" target="_blank">${appUrl}/leads</a>
              </p>

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #cccccc; line-height: 1.6;">
                Happy Hunting,<br>
                <strong style="color: #ffffff;">The Lead Hunter Team</strong>
              </p>

              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 26px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/leads" style="display: inline-block; background-color: #ffffff; color: #0a0a0a; text-decoration: none; font-size: 13px; font-weight: 800; padding: 12px 28px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Open Lead Hunter Feed &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px 32px; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: left;">
              <p style="margin: 0; font-size: 12px; color: #888888; line-height: 1.5;">
                Lead Hunter Club &mdash; Find &amp; close your ideal clients<br>
                <a href="${appUrl}" style="color: #FFB800; font-weight: 600; text-decoration: none;">Visit dashboard</a>
              </p>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #666666; line-height: 1.5;">
                Don&apos;t want these lead drop emails?
                <a href="${unsubUrl}" style="color: #888888; text-decoration: underline;" target="_blank">Unsubscribe from lead alerts</a>
                or manage your preferences in <a href="${appUrl}/settings" style="color: #888888; text-decoration: underline;" target="_blank">Settings</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return { subject, html };
}
