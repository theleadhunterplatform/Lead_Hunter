import fs from 'fs';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import config from '../config';
import prisma from '../lib/prisma';

export type WhatsAppConnectionStatus = 'disconnected' | 'waiting_qr' | 'connecting' | 'connected' | 'logged_out';

export interface WhatsAppGroupItem {
    id: string;
    subject: string;
    participantsCount: number;
}

let sock: any = null;
let connectionStatus: WhatsAppConnectionStatus = 'disconnected';
let latestQr: string | null = null;
let latestQrDataUrl: string | null = null;
let botJid: string | null = null;
let cachedGroups: WhatsAppGroupItem[] = [];
let isInitializing = false;
let reconnectTimer: NodeJS.Timeout | null = null;

// Dynamic target community group (persisted in DB, overrides .env)
let dynamicGroupId: string | null = null;
let dynamicGroupName: string | null = null;

// Batch buffer for lead notifications
let pendingLeadsCount = 0;
let pendingNiches = new Set<string>();
let batchNotificationTimer: NodeJS.Timeout | null = null;

/**
 * Loads the active target community group from the database settings table.
 */
export async function loadTargetWhatsAppGroupFromDb(): Promise<void> {
    try {
        const setting = await prisma.setting.findUnique({
            where: { key: 'whatsapp_community_group' },
        });
        if (setting && setting.value && typeof setting.value === 'object') {
            const val = setting.value as { id?: string; name?: string };
            if (val.id) {
                dynamicGroupId = val.id;
                dynamicGroupName = val.name || null;
                console.log(`ℹ️  [WhatsApp] Loaded target community group from DB: "${dynamicGroupName || dynamicGroupId}" (${dynamicGroupId})`);
            }
        }
    } catch (err: any) {
        console.warn('⚠️  [WhatsApp] Failed to load target group from DB setting:', err.message);
    }
}

/**
 * Sets and persists the target community group for automated lead drop alerts.
 */
export async function setTargetWhatsAppGroup(
    groupId: string,
    groupName?: string
): Promise<{ success: boolean; configuredGroupId: string; configuredGroupName: string | null }> {
    const cleanId = groupId.trim();
    if (!cleanId) {
        throw new Error('Group ID cannot be empty');
    }

    dynamicGroupId = cleanId;
    dynamicGroupName = groupName?.trim() || null;

    try {
        await prisma.setting.upsert({
            where: { key: 'whatsapp_community_group' },
            create: {
                key: 'whatsapp_community_group',
                value: {
                    id: cleanId,
                    name: dynamicGroupName,
                    updatedAt: new Date().toISOString(),
                },
                description: 'Target WhatsApp community group for automated lead drop alerts',
            },
            update: {
                value: {
                    id: cleanId,
                    name: dynamicGroupName,
                    updatedAt: new Date().toISOString(),
                },
                updated_at: new Date(),
            },
        });
        console.log(`✅ [WhatsApp] Target community group saved to DB: "${dynamicGroupName || cleanId}" (${cleanId})`);
    } catch (err: any) {
        console.warn('⚠️  [WhatsApp] Failed to persist group to DB setting (active in memory):', err.message);
    }

    return {
        success: true,
        configuredGroupId: dynamicGroupId,
        configuredGroupName: dynamicGroupName,
    };
}

/**
 * Initializes the Baileys WhatsApp client using MultiFileAuthState.
 */
export async function initWhatsAppClient(): Promise<void> {
    if (!dynamicGroupId) {
        await loadTargetWhatsAppGroupFromDb();
    }
    if (!config.whatsapp.enabled) {
        console.log('ℹ️  [WhatsApp] Service is disabled via WHATSAPP_ENABLED=false');
        return;
    }

    if (sock && connectionStatus === 'connected') {
        console.log('ℹ️  [WhatsApp] Already connected to WhatsApp');
        return;
    }

    if (isInitializing) {
        return;
    }

    isInitializing = true;
    connectionStatus = 'connecting';

    try {
        const sessionDir = config.whatsapp.sessionPath;
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        // Dynamically import ESM Baileys module
        const baileys = await import('@whiskeysockets/baileys');
        const makeWASocket = baileys.makeWASocket || (baileys as any).default;
        const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307], isLatest: true }));

        console.log(`[WhatsApp] Initializing Baileys client (WA Version: ${version.join('.')}, isLatest: ${isLatest})...`);

        sock = makeWASocket({
            version: version as any,
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false, // Handled manually below for clean formatting
            browser: ['Lead Hunter Club', 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
        });

        // Save credentials whenever updated
        sock.ev.on('creds.update', saveCreds);

        // Connection updates listener
        sock.ev.on('connection.update', async (update: any) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                latestQr = qr;
                connectionStatus = 'waiting_qr';
                console.log('\n======================================================');
                console.log('📱 [WhatsApp Bot] SCAN QR CODE TO LINK WHATSAPP:');
                console.log('   Open WhatsApp on your phone -> Settings -> Linked Devices -> Link a Device:');
                console.log('======================================================\n');
                qrcodeTerminal.generate(qr, { small: true });
                console.log('\n======================================================\n');

                try {
                    latestQrDataUrl = await QRCode.toDataURL(qr);
                } catch {
                    latestQrDataUrl = null;
                }
            }

            if (connection === 'open') {
                connectionStatus = 'connected';
                latestQr = null;
                latestQrDataUrl = null;
                botJid = sock?.user?.id || null;
                const cleanPhone = botJid ? botJid.split(':')[0] : 'Unknown';

                console.log(`\n✅ [WhatsApp] Connected successfully! Bot Number: +${cleanPhone}`);

                // Fetch and display participating groups for easy setup
                await refreshParticipatingGroups();
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut;

                console.log(`⚠️  [WhatsApp] Connection closed. Status code: ${statusCode} (Logged out: ${isLoggedOut})`);

                if (isLoggedOut) {
                    connectionStatus = 'logged_out';
                    latestQr = null;
                    latestQrDataUrl = null;
                    botJid = null;
                    sock = null;
                    // Delete session files on explicit logout
                    try {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                        console.log('ℹ️  [WhatsApp] Cleared session files after logout.');
                    } catch (e: any) {
                        console.warn('[WhatsApp] Failed to clear session dir:', e.message);
                    }
                } else {
                    connectionStatus = 'disconnected';
                    sock = null;
                    // Reconnect automatically after a short delay
                    if (!reconnectTimer) {
                        reconnectTimer = setTimeout(() => {
                            reconnectTimer = null;
                            console.log('🔄 [WhatsApp] Attempting reconnection...');
                            initWhatsAppClient().catch((err) => console.error('[WhatsApp] Reconnection error:', err.message));
                        }, 5000);
                    }
                }
            }
        });
    } catch (error: any) {
        connectionStatus = 'disconnected';
        console.error('❌ [WhatsApp] Initialization error:', error.message);
    } finally {
        isInitializing = false;
    }
}

/**
 * Fetches and caches all WhatsApp groups the bot is currently a member of.
 */
export async function refreshParticipatingGroups(): Promise<WhatsAppGroupItem[]> {
    if (!sock || connectionStatus !== 'connected') {
        return cachedGroups;
    }

    try {
        const groups = await sock.groupFetchAllParticipating();
        const list: WhatsAppGroupItem[] = [];

        console.log('------------------------------------------------------');
        console.log('📋 [WhatsApp Bot] Participating Groups:');

        for (const [jid, metadata] of Object.entries(groups as Record<string, any>)) {
            const item: WhatsAppGroupItem = {
                id: jid,
                subject: metadata.subject || 'Unnamed Group',
                participantsCount: metadata.participants ? metadata.participants.length : 0,
            };
            list.push(item);
            console.log(`   • "${item.subject}" -> Group ID: ${item.id} (${item.participantsCount} members)`);
        }

        if (list.length === 0) {
            console.log('   (Bot is not a member of any WhatsApp groups yet)');
        }
        console.log('------------------------------------------------------');

        cachedGroups = list;
        return list;
    } catch (error: any) {
        console.warn('⚠️  [WhatsApp] Failed to fetch participating groups:', error.message);
        return cachedGroups;
    }
}

/**
 * Sends a message to a WhatsApp group.
 */
export async function sendGroupMessage(
    text: string,
    targetGroupId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const groupId = targetGroupId?.trim() || dynamicGroupId || config.whatsapp.groupId?.trim();

    if (!groupId) {
        console.warn('⚠️  [WhatsApp] Cannot send message: No target group configured.');
        return { success: false, error: 'No WhatsApp Group selected. Please select a group in Admin -> Broadcast.' };
    }

    if (!sock || connectionStatus !== 'connected') {
        console.warn('⚠️  [WhatsApp] Cannot send message: Bot is not connected.');
        return { success: false, error: 'WhatsApp bot is not connected' };
    }

    try {
        // Ensure standard group JID suffix
        const jid = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;
        const sent = await sock.sendMessage(jid, { text });

        console.log(`✅ [WhatsApp] Message sent to group [${jid}]: "${text.slice(0, 50)}..."`);
        return { success: true, messageId: sent?.key?.id };
    } catch (error: any) {
        console.error(`❌ [WhatsApp] Failed to send message to group [${groupId}]:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Immediate dispatch for new leads drop announcement.
 */
/**
 * Unlinks the connected WhatsApp device, terminates socket session, deletes stored session credentials,
 * and resets connection state so a fresh device can be linked via QR code.
 */
export async function unlinkWhatsAppDevice(): Promise<{ success: boolean; message: string }> {
    try {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }

        if (sock) {
            try {
                await sock.logout();
            } catch (err: any) {
                console.warn('⚠️  [WhatsApp] Error during sock.logout():', err?.message);
            }
            try {
                sock.end();
            } catch {}
            sock = null;
        }

        connectionStatus = 'disconnected';
        latestQr = null;
        latestQrDataUrl = null;
        botJid = null;
        cachedGroups = [];

        // Clear session directory files
        const sessionDir = config.whatsapp.sessionPath;
        if (fs.existsSync(sessionDir)) {
            try {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                console.log('ℹ️  [WhatsApp] Session files removed for unlinking.');
            } catch (e: any) {
                console.warn('⚠️  [WhatsApp] Failed to delete session dir:', e.message);
            }
        }

        // Trigger fresh client initialization to immediately generate a new QR code for pairing
        setTimeout(() => {
            initWhatsAppClient().catch((err) => console.error('❌ [WhatsApp] Re-init after unlink failed:', err?.message));
        }, 1500);

        return {
            success: true,
            message: 'WhatsApp device unlinked successfully. You can now link a new device.',
        };
    } catch (err: any) {
        return {
            success: false,
            message: err?.message || 'Failed to unlink WhatsApp device',
        };
    }
}

/**
 * Immediate dispatch for new leads drop announcement.
 */
export async function dispatchLeadDropAlert(
    leadsCount: number,
    categories: string[] = []
): Promise<{ success: boolean; error?: string }> {
    let appUrl = (process.env.FRONTEND_URL || 'https://www.theleadhunterclub.com').trim();
    // Guarantee canonical production link even if server environment variable has stale vercel.app or old URL
    if (appUrl.includes('vercel.app') || (!appUrl.includes('localhost') && !appUrl.includes('127.0.0.1'))) {
        appUrl = 'https://www.theleadhunterclub.com';
    }
    appUrl = appUrl.replace(/\/+$/, '');

    const cleanCategories = categories.filter(Boolean);
    const categoryText = cleanCategories.length > 0
        ? cleanCategories.slice(0, 4).join(', ')
        : 'Web Dev, Design, Marketing & AI';

    const opportunityText = leadsCount === 1
        ? '🔥 *1 new verified client opportunity* has just been approved and added to the platform!'
        : `🔥 *${leadsCount} new verified client opportunities* have just been approved and added to the platform!`;

    const message = [
        '🚀 *Fresh Leads Dropped — Lead Hunter Club*',
        '',
        opportunityText,
        '',
        `📌 *Niches:* ${categoryText}`,
        '',
        `👉 *Claim & review them now before competitors:*`,
        `${appUrl}/leads`,
    ].join('\n');

    return sendGroupMessage(message);
}

/**
 * Batches newly approved leads so multiple consecutive approvals don't spam the group.
 * Consolidates notifications over a 5-second window into a single announcement.
 */
export function queueLeadDropNotification(
    leadsCount: number = 1,
    category?: string | string[],
    delayMs: number = 5_000
): void {
    if (!config.whatsapp.enabled) return;

    pendingLeadsCount += leadsCount;
    if (Array.isArray(category)) {
        category.forEach((c) => {
            if (c && typeof c === 'string' && c.trim()) pendingNiches.add(c.trim());
        });
    } else if (category && typeof category === 'string' && category.trim()) {
        pendingNiches.add(category.trim());
    }

    if (batchNotificationTimer) {
        clearTimeout(batchNotificationTimer);
    }

    batchNotificationTimer = setTimeout(async () => {
        const count = pendingLeadsCount;
        const niches = Array.from(pendingNiches);

        pendingLeadsCount = 0;
        pendingNiches.clear();
        batchNotificationTimer = null;

        if (count > 0) {
            console.log(`🔔 [WhatsApp] Firing batched lead drop alert for ${count} approved leads...`);
            await dispatchLeadDropAlert(count, niches);
        }
    }, delayMs);
}

/**
 * Returns the current health and status of the WhatsApp bot.
 */
export function getWhatsAppStatus(): {
    status: WhatsAppConnectionStatus;
    enabled: boolean;
    configuredGroupId: string;
    configuredGroupName: string | null;
    botNumber: string | null;
    hasQr: boolean;
    qrDataUrl: string | null;
    groupsCount: number;
} {
    const cleanPhone = botJid ? botJid.split(':')[0] : null;
    const activeGroupId = dynamicGroupId || config.whatsapp.groupId || '';
    const matchedGroup = cachedGroups.find(
        (g) => g.id === activeGroupId || `${g.id}@g.us` === activeGroupId
    );
    const activeGroupName = dynamicGroupName || matchedGroup?.subject || null;

    return {
        status: connectionStatus,
        enabled: config.whatsapp.enabled,
        configuredGroupId: activeGroupId,
        configuredGroupName: activeGroupName,
        botNumber: cleanPhone,
        hasQr: !!latestQr,
        qrDataUrl: latestQrDataUrl,
        groupsCount: cachedGroups.length,
    };
}

/**
 * Returns cached WhatsApp groups the bot is in.
 */
export function getWhatsAppGroups(): WhatsAppGroupItem[] {
    return cachedGroups;
}
