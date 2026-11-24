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
        parse_mode?: 'HTML' | 'MarkdownV2' | 'Markdown';
        inline_keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
        reply_markup?: {
            inline_keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
        };
    }
): Promise<boolean> {
    const { botToken, enabled } = await getBotConfig();
    if (!enabled || !botToken) return false;

    const replyMarkup =
        options?.reply_markup ||
        (options?.inline_keyboard ? { inline_keyboard: options.inline_keyboard } : undefined);

    try {
        const res = await axios.post(
            `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`,
            {
                chat_id: chatId,
                text,
                parse_mode: options?.parse_mode || 'HTML',
                reply_markup: replyMarkup,
            },
            { timeout: 8000 }
        );
        return res.data?.ok === true;
    } catch (err: any) {
        console.warn(`[TelegramService] Failed to send message to ${chatId}:`, err.response?.data?.description || err.message);
        return false;
    }
}

export function formatTelegramLeadCard(
    lead: {
        id: string;
        title?: string | null;
        niche?: string | null;
        platform?: string | null;
        content?: string | null;
        snippet?: string | null;
        keyword?: string | null;
    },
    appUrl: string
): { text: string; keyboard: Array<Array<{ text: string; url: string }>> } {
    const displayTitle =
        lead.title?.trim() ||
        (lead.niche ? `${lead.niche} Opportunity` : lead.keyword || 'Strategic Client Opportunity');
    const niche = (lead.niche || lead.keyword || 'Strategic Lead').trim().toUpperCase();

    let snippet = lead.snippet || '';
    if (!snippet && lead.content) {
        const clean = lead.content.replace(/\s+/g, ' ').trim();
        snippet = clean.length > 200 ? clean.slice(0, 200) + '...' : clean;
    }

    const cleanAppUrl = appUrl.replace(/\/+$/, '');
    const leadUrl = `${cleanAppUrl}/leads?lead=${encodeURIComponent(lead.id)}`;

    const text = `💼 <b>Lead Hunter Club</b>

🏷️ <b>[${escapeTgHtml(niche)}]</b>
<b>${escapeTgHtml(displayTitle)}</b>

${snippet ? `${escapeTgHtml(snippet)}\n\n` : ''}👉 <i>Claim before competitors reach out!</i>`;

    const keyboard = [
        [
            { text: '⚡ View & Claim Lead ↗', url: leadUrl },
        ],
    ];

    return { text, keyboard };
}

export async function broadcastTelegramLeadAlert(
    leads: Array<{
        id: string;
        title?: string | null;
        niche?: string | null;
        platform?: string | null;
        content?: string | null;
        snippet?: string | null;
        keyword?: string | null;
    }>
): Promise<{ sent: number; failed: number }> {
    if (!leads || leads.length === 0) return { sent: 0, failed: 0 };

    const { botToken, enabled } = await getBotConfig();
    if (!enabled || !botToken) {
        console.log('[TelegramService] Bot not configured or disabled — skipping Telegram lead alert');
        return { sent: 0, failed: 0 };
    }

    const appUrl = (process.env.FRONTEND_URL || 'https://www.theleadhunterclub.com').replace(/\/+$/, '');

    // 1. Check if a community channel/group is configured
    const channelSetting = await prisma.setting.findUnique({
        where: { key: 'telegram_community_channel' },
    });
    const channelVal = (channelSetting?.value as Record<string, any>) || {};
    const channelId = channelVal.channel_id;

    // 2. Fetch active users with a connected Telegram chat ID
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

    if (!channelId && users.length === 0) {
        console.log('[TelegramService] No community channel or connected users found — skipping Telegram lead alert');
        return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Dispatches each lead directly as an INDIVIDUAL Telegram message card
    for (const lead of leads) {
        const { text: messageText, keyboard } = formatTelegramLeadCard(lead, appUrl);

        // Send directly to the Telegram Community Channel
        if (channelId) {
            const channelOk = await sendTelegramMessage(channelId, messageText, {
                inline_keyboard: keyboard,
            });
            if (channelOk) sent++;
            else failed++;
        }

        // Send directly to individual hunters with connected Telegram
        for (const user of users) {
            if (!user.telegram_chat_id) continue;
            const ok = await sendTelegramMessage(user.telegram_chat_id, messageText, {
                inline_keyboard: keyboard,
            });
            if (ok) sent++;
            else failed++;
        }
    }

    console.log(`[TelegramService] Broadcast complete: ${sent} individual lead messages sent, ${failed} failed across ${users.length} users.`);
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
