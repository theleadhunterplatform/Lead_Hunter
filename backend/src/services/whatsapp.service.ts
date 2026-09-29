import fs from 'fs';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import config from '../config';

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

// Batch buffer for lead notifications
let pendingLeadsCount = 0;
let pendingNiches = new Set<string>();
let batchNotificationTimer: NodeJS.Timeout | null = null;

/**
 * Initializes the Baileys WhatsApp client using MultiFileAuthState.
 */
export async function initWhatsAppClient(): Promise<void> {
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
    const groupId = targetGroupId?.trim() || config.whatsapp.groupId?.trim();

    if (!groupId) {
        console.warn('⚠️  [WhatsApp] Cannot send message: No WHATSAPP_GROUP_ID configured.');
        return { success: false, error: 'No WhatsApp Group ID configured' };
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
export async function dispatchLeadDropAlert(
    leadsCount: number,
    categories: string[] = []
): Promise<{ success: boolean; error?: string }> {
    const appUrl = (process.env.FRONTEND_URL || 'https://leadhunterclub.com').replace(/\/$/, '');
    const cleanCategories = categories.filter(Boolean);
    const categoryText = cleanCategories.length > 0
        ? cleanCategories.slice(0, 4).join(', ')
        : 'Web Dev, Design, Marketing & AI';

    const message = [
        '🚀 *Fresh Leads Dropped — Lead Hunter Club*',
        '',
        `🔥 *${leadsCount} new high-intent client opportunities* have just been verified and added to the platform!`,
        '',
        `📌 *Niches:* ${categoryText}`,
        '',
        `👉 *Claim & review them now before competitors:*`,
        `${appUrl}/leads`,
    ].join('\n');

    return sendGroupMessage(message);
}

/**
 * Batches incoming scraped leads so multiple individual leads don't spam the group.
 * Consolidates notifications over a 30-second quiet window into a single announcement.
 */
export function queueLeadDropNotification(leadsCount: number = 1, category?: string): void {
    if (!config.whatsapp.enabled) return;

    pendingLeadsCount += leadsCount;
    if (category?.trim()) {
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
            console.log(`🔔 [WhatsApp] Firing batched lead drop alert for ${count} leads...`);
            await dispatchLeadDropAlert(count, niches);
        }
    }, 30_000); // 30-second consolidation window
}

/**
 * Returns the current health and status of the WhatsApp bot.
 */
export function getWhatsAppStatus(): {
    status: WhatsAppConnectionStatus;
    enabled: boolean;
    configuredGroupId: string;
    botNumber: string | null;
    hasQr: boolean;
    qrDataUrl: string | null;
    groupsCount: number;
} {
    const cleanPhone = botJid ? botJid.split(':')[0] : null;

    return {
        status: connectionStatus,
        enabled: config.whatsapp.enabled,
        configuredGroupId: config.whatsapp.groupId,
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
