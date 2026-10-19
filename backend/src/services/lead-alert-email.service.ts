import prisma from '../lib/prisma';
import {
    isEmailConfigured,
    sendEmail,
    buildLeadDropAlertEmail,
    LeadAlertEmailItem,
} from '../utils/email.service';

let pendingEmailLeads: LeadAlertEmailItem[] = [];
let emailBatchTimer: NodeJS.Timeout | null = null;

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dispatches lead drop alert emails to all active users with lead links and titles.
 */
export async function dispatchLeadAlertEmails(leads: LeadAlertEmailItem[]): Promise<{
    sent: number;
    failed: number;
    totalUsers: number;
}> {
    if (!isEmailConfigured()) {
        console.warn(
            '⚠️  [LeadAlertEmail] Email service is not configured (RESEND_API_KEY or SMTP not set). Skipping email alerts.'
        );
        return { sent: 0, failed: 0, totalUsers: 0 };
    }

    if (!leads || leads.length === 0) {
        return { sent: 0, failed: 0, totalUsers: 0 };
    }

    try {
        // Check broadcast email automation toggle
        const automationSetting = await prisma.setting.findUnique({
            where: { key: 'email_automation_config' },
        });
        const autoConfig = (automationSetting?.value as Record<string, any>) || {};
        if (autoConfig.auto_email_enabled === false || autoConfig.lead_drop_emails_enabled === false) {
            console.log('ℹ️  [LeadAlertEmail] Lead drop email alerts are paused in Broadcast Automation settings.');
            return { sent: 0, failed: 0, totalUsers: 0 };
        }

        const users = await prisma.user.findMany({
            where: {
                status: 'active',
                is_active: true,
                is_deleted: false,
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        const validUsers = users.filter((u) => u.email && u.email.trim().includes('@'));
        if (validUsers.length === 0) {
            console.log('ℹ️  [LeadAlertEmail] No active users with email found to notify.');
            return { sent: 0, failed: 0, totalUsers: 0 };
        }

        console.log(
            `🔔 [LeadAlertEmail] Dispatching lead drop alert for ${leads.length} approved lead(s) to ${validUsers.length} active users...`
        );

        const appUrl = (process.env.FRONTEND_URL || 'https://www.theleadhunterclub.com').replace(/\/+$/, '');
        const batchSize = 5;
        let sent = 0;
        let failed = 0;

        for (let i = 0; i < validUsers.length; i += batchSize) {
            const batch = validUsers.slice(i, i + batchSize);
            const results = await Promise.allSettled(
                batch.map(async (user) => {
                    const { subject, html } = buildLeadDropAlertEmail(
                        user.name || 'there',
                        leads,
                        appUrl
                    );
                    try {
                        await sendEmail({
                            to: user.email.trim(),
                            subject,
                            html,
                        });
                        await prisma.emailLog.create({
                            data: {
                                to: user.email.trim(),
                                subject,
                                type: 'LEAD_ALERT',
                                status: 'SENT',
                            },
                        }).catch(() => {});
                    } catch (sendErr: any) {
                        await prisma.emailLog.create({
                            data: {
                                to: user.email.trim(),
                                subject,
                                type: 'LEAD_ALERT',
                                status: 'FAILED',
                                error: sendErr.message || 'Send error',
                            },
                        }).catch(() => {});
                        throw sendErr;
                    }
                })
            );

            for (const res of results) {
                if (res.status === 'fulfilled') {
                    sent++;
                } else {
                    failed++;
                    console.error(
                        '[LeadAlertEmail] Delivery failure:',
                        (res as PromiseRejectedResult).reason?.message
                    );
                }
            }

            if (i + batchSize < validUsers.length) {
                await sleep(150);
            }
        }

        console.log(
            `✔ [LeadAlertEmail] Finished email dispatch: ${sent} sent successfully, ${failed} failed.`
        );

        return { sent, failed, totalUsers: validUsers.length };
    } catch (err: any) {
        console.error('❌ [LeadAlertEmail] Error dispatching lead alert emails:', err.message);
        return { sent: 0, failed: 0, totalUsers: 0 };
    }
}

/**
 * Batches newly approved leads so multiple rapid approvals consolidate into a single email
 * rather than spamming users with multiple emails within seconds.
 */
export function queueLeadDropEmailAlert(
    items: LeadAlertEmailItem | LeadAlertEmailItem[],
    delayMs: number = 60000
): void {
    const list = Array.isArray(items) ? items : [items];
    for (const item of list) {
        if (item && item.id && !pendingEmailLeads.some((p) => p.id === item.id)) {
            pendingEmailLeads.push(item);
        }
    }

    if (emailBatchTimer) {
        clearTimeout(emailBatchTimer);
    }

    emailBatchTimer = setTimeout(async () => {
        const toSend = [...pendingEmailLeads];
        pendingEmailLeads = [];
        emailBatchTimer = null;

        if (toSend.length > 0) {
            await dispatchLeadAlertEmails(toSend);
        }
    }, delayMs);
}

/**
 * Allows sending a test lead alert email directly to an admin or tester email address.
 */
export async function sendTestLeadAlertEmail(toEmail: string): Promise<void> {
    const appUrl = (process.env.FRONTEND_URL || 'https://www.theleadhunterclub.com').replace(/\/+$/, '');
    const sampleLeads: LeadAlertEmailItem[] = [
        {
            id: 'sample-lead-1',
            title: 'Looking for a Senior Meta Ads Media Buyer for D2C Brand ($50k/mo budget)',
            niche: 'Paid Ads & Marketing',
            platform: 'LinkedIn',
            content:
                'We are scaling our apparel brand from $100k/mo to $300k/mo and need a battle-tested media buyer to take over our Meta and TikTok ad accounts immediately. DM case studies and availability.',
        },
        {
            id: 'sample-lead-2',
            title: 'Full Website Redesign & Webflow Implementation for B2B SaaS',
            niche: 'UI/UX Design',
            platform: 'LinkedIn',
            content:
                'Need an experienced product designer to redesign our core web app dashboard and build a high-converting marketing site in Webflow. Budget is open for top talent.',
        },
    ];

    const { subject, html } = buildLeadDropAlertEmail('Test Admin', sampleLeads, appUrl);
    await sendEmail({
        to: toEmail,
        subject: `[TEST] ${subject}`,
        html,
    });
}
