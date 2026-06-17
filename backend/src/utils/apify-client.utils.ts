import { ApifyClient } from 'apify-client';
import ApifyKey from '../models/apify-key.model';
import prisma from '../lib/prisma';
import config from '../config';

export type ApifyKeyRecord = Awaited<ReturnType<typeof ApifyKey.find>>[number];

function currentUsageMonth(): string {
    return new Date().toISOString().slice(0, 7);
}

export async function getApifyClient(): Promise<{ client: ApifyClient; activeKey: ApifyKeyRecord | null }> {
    const activeKeys = await ApifyKey.find({ is_active: true, is_deleted: false }, { sort: { created_at: 1 } });
    const activeKey = activeKeys[0] || null;
    const apiToken = activeKey ? activeKey.key : config.apify.token;

    if (!apiToken) {
        throw new Error('No active Apify tokens available.');
    }

    return { client: new ApifyClient({ token: apiToken }), activeKey };
}

export async function recordApifyCommentUsage(activeKey: ApifyKeyRecord | null, commentCount: number): Promise<void> {
    if (!activeKey || commentCount <= 0) return;

    const keyId = activeKey._id || activeKey.id;
    if (!keyId) return;

    const month = currentUsageMonth();
    const existing = await prisma.apifyKey.findUnique({ where: { id: keyId } });
    if (!existing) return;

    const resetUsage = existing.usage_month !== month;
    await prisma.apifyKey.update({
        where: { id: keyId },
        data: {
            usage_month: month,
            comments_used: resetUsage ? commentCount : { increment: commentCount },
        },
    });
}

export function isApifyLimitError(error: any): boolean {
    return error?.statusCode === 402 ||
        error?.statusCode === 403 ||
        error?.message?.includes('usage limit reached');
}

export async function handleApifyLimitError(error: any, activeKey: ApifyKeyRecord | null): Promise<void> {
    if (isApifyLimitError(error) && activeKey) {
        console.warn(`⚠️ Token limit reached for ${activeKey.label || 'current key'}. Rotating...`);
        activeKey.is_active = false;
        await activeKey.save();
    }
}
