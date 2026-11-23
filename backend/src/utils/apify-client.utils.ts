import { ApifyClient } from 'apify-client';
import axios from 'axios';
import ApifyKey from '../models/apify-key.model';
import prisma from '../lib/prisma';
import config from '../config';
import {
    getWorkerId,
    releaseWorkerApifyLease,
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

export async function updateApifyKeyBalance(activeKey: ApifyKeyRecord | null): Promise<void> {
    if (!activeKey?.key) return;
    const keyId = activeKey._id || activeKey.id;
    if (!keyId) return;

    try {
        const response = await axios.get('https://api.apify.com/v2/users/me/limits', {
            headers: { Authorization: `Bearer ${activeKey.key}` },
            timeout: 10000,
        });
        const current = response.data?.data?.current;
        const limits = response.data?.data?.limits;
        const usedUsd = current?.monthlyUsageUsd;
        const maxUsd = limits?.maxMonthlyUsageUsd ?? 5.0;

        if (typeof usedUsd === 'number') {
            const remainingUsd = Math.max(0, maxUsd - usedUsd);
            const isExhausted = remainingUsd === 0 || usedUsd >= maxUsd;
            await prisma.apifyKey.update({
                where: { id: keyId },
                data: {
                    is_active: !isExhausted,
                    error_message: isExhausted
                        ? `Apify spend exhausted ($${usedUsd.toFixed(2)} / $${maxUsd.toFixed(2)})`
                        : null,
                },
            });
            console.log(
                `💳 [ApifyBalance] Token ${activeKey.label || keyId}: Used $${usedUsd.toFixed(2)} / $${maxUsd.toFixed(2)} | Remaining $${remainingUsd.toFixed(2)}`
            );
        }
    } catch (err: any) {
        if (err?.response?.status === 401 && keyId) {
            await prisma.apifyKey.update({
                where: { id: keyId },
                data: {
                    is_active: false,
                    error_message: '401 Unauthorized / Invalid Token',
                },
            });
        }
    }
}

export async function recordApifyCommentUsage(activeKey: ApifyKeyRecord | null, commentCount: number): Promise<void> {
    if (!activeKey) return;

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
            comments_used: commentCount > 0 ? (resetUsage ? commentCount : { increment: commentCount }) : undefined,
        },
    });

    // After scrape cycle, query Apify live limits to update real balance amount & auto-exhaust if limit reached
    await updateApifyKeyBalance(activeKey).catch((e) =>
        console.warn(`[ApifyBalance] Failed to update balance for ${activeKey.label || keyId}:`, e.message)
    );
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

export async function handleApifyLimitError(_error: any, activeKey: ApifyKeyRecord | null): Promise<void> {
    if (!activeKey) return;

    // Release worker lease so next request uses another token immediately.
    // We NEVER permanently deactivate keys in PostgreSQL from runtime scraping errors.
    await releaseWorkerApifyLease(getWorkerId());
}

export { getWorkerId, getApifyLeaseStatus, releaseWorkerApifyLease } from './apify-token-manager.utils';
