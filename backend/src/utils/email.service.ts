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
    appUrl: string = (process.env.FRONTEND_URL || 'https://www.theleadhunterclub.com').replace(/\/+$/, '')
) {
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
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 18px; background-color: #171a21; border: 1px solid #2b313d; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 18px 20px;">
                  <div style="margin-bottom: 8px;">
                    <span style="display: inline-block; background-color: rgba(255, 87, 34, 0.15); color: #ff5722; border: 1px solid rgba(255, 87, 34, 0.35); font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; margin-right: 6px;">
                      ${escapeHtml(lead.niche || lead.keyword || 'Lead')}
                    </span>
                    <span style="display: inline-block; background-color: #232832; color: #9ca3af; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
                      ${escapeHtml(lead.platform || 'LinkedIn')}
                    </span>
                  </div>
                  <h3 style="color: #ffffff; font-size: 16px; font-weight: 700; margin: 0 0 8px 0; line-height: 1.4;">
                    ${escapeHtml(displayTitle)}
                  </h3>
                  ${snippet ? `<p style="color: #9ca3af; font-size: 13px; line-height: 1.55; margin: 0 0 14px 0;">${snippet}</p>` : ''}
                  <a href="${leadUrl}" style="display: inline-block; background-color: #ff5722; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 800; padding: 9px 18px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                    View &amp; Claim Lead &rarr;
                  </a>
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
<body style="margin: 0; padding: 0; background-color: #0b0d10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0d10; padding: 28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #11141a; border: 1px solid #232834; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #0d0f14; padding: 22px 28px; border-bottom: 2px solid #ff5722;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="color: #ff5722; font-size: 18px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">⚡ LEAD HUNTER</span>
                  </td>
                  <td align="right">
                    <span style="background-color: #ff5722; color: #ffffff; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.8px;">VERIFIED DROP</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px;">
              <h1 style="color: #ffffff; font-size: 21px; font-weight: 800; margin: 0 0 10px 0; line-height: 1.3;">
                ${isSingle ? 'New Verified Lead Approved' : `${leads.length} New Verified Leads Approved`}
              </h1>
              <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 22px 0;">
                Hi ${escapeHtml(userName || 'Hunter')}, new client opportunities matching active market demand have just been reviewed and approved on Lead Hunter. Claim before competitors reach out.
              </p>

              <!-- Lead Cards -->
              ${leadCardsHtml}

              <!-- Bottom CTA -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px; border-top: 1px solid #232834; padding-top: 22px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/leads" style="display: inline-block; background-color: #ffffff; color: #0b0d10; text-decoration: none; font-size: 14px; font-weight: 800; padding: 13px 30px; border-radius: 7px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Open Lead Hunter Feed &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0d0f14; padding: 18px 28px; border-top: 1px solid #1c212b; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">
                You are receiving this real-time notification because your Lead Hunter account is active.
              </p>
              <p style="color: #4b5563; font-size: 11px; margin: 0;">
                &copy; ${new Date().getFullYear()} Lead Hunter. All rights reserved.
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
