import axios from 'axios';
import prisma from '../lib/prisma';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

function escapeTgHtml(str?: string | null): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function getBotConfig(): Promise<{ botToken: string; enabled: boolean }> {
    const envToken = process.env.TELEGRAM_BOT_TOKEN;
    if (envToken && envToken.trim()) {
        return { botToken: envToken.trim(), enabled: true };
    }

    try {
        const setting = await prisma.setting.findUnique({
            where: { key: 'telegram_config' },
        });
        const val = (setting?.value as Record<string, any>) || {};
        return {
            botToken: (val.bot_token || '').trim(),
            enabled: val.enabled !== false && Boolean(val.bot_token),
        };
    } catch {
        return { botToken: '', enabled: false };
    }
}

export async function sendTelegramMessage(
    chatId: string | number,
    text: string,
    options?: {
        inline_keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
    }
): Promise<boolean> {
    const { botToken, enabled } = await getBotConfig();
    if (!enabled || !botToken) return false;

    try {
        const res = await axios.post(
            `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`,
            {
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                reply_markup: options?.inline_keyboard
                    ? { inline_keyboard: options.inline_keyboard }
                    : undefined,
            },
            { timeout: 8000 }
        );
        return res.data?.ok === true;
    } catch (err: any) {
        console.warn(`[TelegramService] Failed to send message to ${chatId}:`, err.response?.data?.description || err.message);
        return false;
    }
}

export async function broadcastTelegramLeadAlert(
    leads: Array<{
        id: string;
        title?: string | null;
        niche?: string | null;
        platform?: string | null;
        content?: string | null;
        snippet?: string | null;
    }>
): Promise<{ sent: number; failed: number }> {
    if (!leads || leads.length === 0) return { sent: 0, failed: 0 };

    const { botToken, enabled } = await getBotConfig();
    if (!enabled || !botToken) {
        console.log('[TelegramService] Bot not configured or disabled — skipping Telegram lead alert');
        return { sent: 0, failed: 0 };
    }

    const appUrl = process.env.FRONTEND_URL || 'https://www.theleadhunterclub.com';

    // Fetch active users with a connected Telegram chat ID
    const users = await prisma.user.findMany({
        where: {
            status: { in: ['active', 'ACTIVE'] },
            is_active: true,
            is_deleted: false,
            telegram_chat_id: { not: null },
        },
        select: {
            id: true,
            name: true,
            telegram_chat_id: true,
        },
    });

    if (users.length === 0) {
        console.log('[TelegramService] No active users with connected Telegram accounts found.');
        return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const lead of leads) {
        const title = lead.title?.trim() || 'New High-Intent Client Requirement';
        const niche = lead.niche || 'High-Intent Demand';
        const cleanContent = lead.content ? lead.content.replace(/\s+/g, ' ').trim() : '';
        const snippet = lead.snippet || (cleanContent ? cleanContent.slice(0, 180) + '...' : '');
        const leadUrl = `${appUrl}/leads?lead=${encodeURIComponent(lead.id)}`;

        const messageText = `🔥 <b>New Lead Alert | ${escapeTgHtml(niche)}</b>

<b>${escapeTgHtml(title)}</b>

${snippet ? `<i>"${escapeTgHtml(snippet)}"</i>\n` : ''}
👉 <i>Claim before competitors reach out!</i>`;

        const keyboard = [
            [
                { text: '🚀 View & Claim on Dashboard ↗', url: leadUrl },
            ],
        ];

        for (const user of users) {
            if (!user.telegram_chat_id) continue;
            const ok = await sendTelegramMessage(user.telegram_chat_id, messageText, {
                inline_keyboard: keyboard,
            });
            if (ok) sent++;
            else failed++;
        }
    }

    console.log(`[TelegramService] Broadcast complete: ${sent} sent, ${failed} failed across ${users.length} users.`);
    return { sent, failed };
}

export const DEFAULT_TELEGRAM_COMMUNITY_TEMPLATE = `🚀 <b>Fresh Leads Dropped — Lead Hunter Club</b>

🔥 <b>{count} new verified client opportunit{count_suffix}</b> {have_has} just been approved and added to the platform!

📌 <b>Niches:</b> {niches}

👉 <b>Review & unlock them now on the Dashboard:</b>
{link}`;

export async function dispatchTelegramCommunityDrop(
    count: number,
    niches: string[]
): Promise<boolean> {
    const channelSetting = await prisma.setting.findUnique({
        where: { key: 'telegram_community_channel' },
    });
    const val = (channelSetting?.value as Record<string, any>) || {};
    const channelId = val.channel_id;
    if (!channelId) {
        console.log('[TelegramService] No community channel configured — skipping community drop');
        return false;
    }

    const tplSetting = await prisma.setting.findUnique({
        where: { key: 'telegram_alert_template' },
    });
    const rawTemplate = (tplSetting?.value as Record<string, any>)?.template || DEFAULT_TELEGRAM_COMMUNITY_TEMPLATE;

    const appUrl = process.env.FRONTEND_URL || 'https://www.theleadhunterclub.com';
    const message = rawTemplate
        .replace(/{count}/g, String(count))
        .replace(/{count_suffix}/g, count === 1 ? 'y' : 'ies')
        .replace(/{have_has}/g, count === 1 ? 'has' : 'have')
        .replace(/{niches}/g, niches.length > 0 ? niches.slice(0, 4).join(', ') : 'High-Intent Niches')
        .replace(/{link}/g, `${appUrl}/leads`);

    console.log(`📢 [TelegramService] Posting community lead drop to channel ${channelId}`);
    return sendTelegramMessage(channelId, message, {
        inline_keyboard: [
            [{ text: '🚀 Review & Claim on Dashboard ↗', url: `${appUrl}/leads` }],
        ],
    });
}

let pendingTgDropCount = 0;
const pendingTgNiches = new Set<string>();
let tgBatchTimer: NodeJS.Timeout | null = null;

export function queueTelegramCommunityDropNotification(
    leadsCount: number = 1,
    category?: string | string[],
    delayMs: number = 60_000
): void {
    pendingTgDropCount += leadsCount;
    if (Array.isArray(category)) {
        category.forEach((c) => {
            if (c && typeof c === 'string' && c.trim()) pendingTgNiches.add(c.trim());
        });
    } else if (category && typeof category === 'string' && category.trim()) {
        pendingTgNiches.add(category.trim());
    }

    if (tgBatchTimer) clearTimeout(tgBatchTimer);

    tgBatchTimer = setTimeout(async () => {
        const count = pendingTgDropCount;
        const niches = Array.from(pendingTgNiches);
        pendingTgDropCount = 0;
        pendingTgNiches.clear();
        tgBatchTimer = null;

        if (count > 0) {
            console.log(`🔔 [Telegram] Firing batched community lead drop alert for ${count} approved leads...`);
            await dispatchTelegramCommunityDrop(count, niches);
        }
    }, delayMs);
}
