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
