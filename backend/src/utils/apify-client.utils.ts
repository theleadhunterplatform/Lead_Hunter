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
    const rawMsg = [
        error?.message,
        error?.type,
        error?.name,
        error?.data?.message,
        error?.data?.error?.message,
        error?.response?.data?.error?.message,
        error?.response?.data?.message,
        typeof error?.data === 'string' ? error.data : '',
    ].filter(Boolean).join(' ').toLowerCase();

    // Concurrency, temporary rate limits, or server busy errors are NEVER permanent key limits
    if (
        rawMsg.includes('concurrent') ||
        rawMsg.includes('rate limit') ||
        rawMsg.includes('too many requests') ||
        rawMsg.includes('exceed your limit of') ||
        rawMsg.includes('actor runs') ||
        rawMsg.includes('actor-max-concurrent-runs-exceeded') ||
        rawMsg.includes('429')
    ) {
        return false;
    }

    const status = error?.statusCode ?? error?.status ?? error?.response?.status;

    // Auth error: invalid, expired, revoked token or deleted account
    if (status === 401) return true;
    if (
        rawMsg.includes('not valid') ||
        rawMsg.includes('authentication token') ||
        rawMsg.includes('invalid token') ||
        rawMsg.includes('user was not found')
    ) {
        return true;
    }

    // Quota and billing limits (only when balance/credits are genuinely spent)
    if (status === 402) return true;
    if (
        rawMsg.includes('usage limit') ||
        rawMsg.includes('monthly usage') ||
        rawMsg.includes('insufficient credits') ||
        rawMsg.includes('payment required') ||
        rawMsg.includes('free monthly credits are fully spent')
    ) {
        return true;
    }

    return false;
}

export async function handleApifyLimitError(error: any, activeKey: ApifyKeyRecord | null): Promise<void> {
    if (!isApifyLimitError(error) || !activeKey) return;

    const keyId = activeKey._id || activeKey.id;
    if (!keyId) return;

    console.warn(`⚠️ Apify error for ${activeKey.label || 'current key'} (${error?.message || 'limit/invalid'}). Marking inactive and rotating...`);
    await markApifyKeyExhausted(keyId);
}

export { getWorkerId, getApifyLeaseStatus, releaseWorkerApifyLease } from './apify-token-manager.utils';
