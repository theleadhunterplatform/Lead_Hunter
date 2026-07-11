import { ApifyClient } from 'apify-client';
import ApifyKey from '../models/apify-key.model';
import prisma from '../lib/prisma';
import config from '../config';
import {
    getWorkerId,
    markApifyKeyExhausted,
    resolveApifyKeyForWorker,
} from './apify-token-manager.utils';

export type ApifyKeyRecord = Awaited<ReturnType<typeof ApifyKey.find>>[number];

function currentUsageMonth(): string {
    return new Date().toISOString().slice(0, 7);
}

export async function getApifyClient(): Promise<{ client: ApifyClient; activeKey: ApifyKeyRecord | null }> {
    const activeKey = await resolveApifyKeyForWorker(getWorkerId());
    const apiToken = activeKey?.key || config.apify.token;

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
    const updated = await prisma.apifyKey.update({
        where: { id: keyId },
        data: {
            usage_month: month,
            comments_used: resetUsage ? commentCount : { increment: commentCount },
        },
    });

    const limit = updated.comments_limit ?? config.apify.monthlyCommentLimit;
    if ((updated.comments_used ?? 0) >= limit) {
        console.warn(`⚠️ Comment quota reached for ${activeKey.label || 'current key'}. Rotating...`);
        await markApifyKeyExhausted(keyId);
    }
}

export function isApifyLimitError(error: any): boolean {
    const status = error?.statusCode ?? error?.status;
    const message = String(error?.message || error?.data?.message || '').toLowerCase();

    // Do not treat every 403 as exhausted (can be auth/permission noise).
    if (status === 402) return true;
    if (
        message.includes('usage limit') ||
        message.includes('monthly usage') ||
        message.includes('limit exceeded') ||
        message.includes('payment required') ||
        message.includes('insufficient credits')
    ) {
        return true;
    }
    if (status === 403 && (message.includes('limit') || message.includes('quota') || message.includes('usage'))) {
        return true;
    }
    return false;
}

export async function handleApifyLimitError(error: any, activeKey: ApifyKeyRecord | null): Promise<void> {
    if (!isApifyLimitError(error) || !activeKey) return;

    const keyId = activeKey._id || activeKey.id;
    if (!keyId) return;

    console.warn(`⚠️ Token limit reached for ${activeKey.label || 'current key'}. Rotating...`);
    await markApifyKeyExhausted(keyId);
}

export { getWorkerId, getApifyLeaseStatus, releaseWorkerApifyLease } from './apify-token-manager.utils';
