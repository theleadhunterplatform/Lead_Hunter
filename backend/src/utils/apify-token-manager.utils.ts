import os from 'os';
import Redis from 'ioredis';
import config from '../config';
import ApifyKey from '../models/apify-key.model';
import prisma from '../lib/prisma';

type ApifyKeyRecord = Awaited<ReturnType<typeof ApifyKey.find>>[number];

const WORKER_LEASE_PREFIX = 'apify:worker-lease:';
const KEY_LEASE_PREFIX = 'apify:key-lease:';
const LEASE_TTL_SECONDS = 180;

let redisClient: Redis | null = null;

/** In-process fallback when Redis is unavailable (local dev). */
const localWorkerToKey = new Map<string, string>();
const localKeyToWorker = new Map<string, string>();

function currentUsageMonth(): string {
    return new Date().toISOString().slice(0, 7);
}

function getRedisClient(): Redis {
    if (!redisClient) {
        redisClient = new Redis(config.redis.url, {
            maxRetriesPerRequest: 2,
            connectTimeout: 3000,
            family: 4,
            lazyConnect: true,
        });
    }
    return redisClient;
}

export function getWorkerId(): string {
    const configured = process.env.WORKER_ID?.trim();
    if (configured) return configured;
    return `${os.hostname()}:${process.pid}`;
}

function keyHasRemainingQuota(record: ApifyKeyRecord, month: string): boolean {
    const limit = record.comments_limit ?? config.apify.monthlyCommentLimit;
    const used = record.usage_month === month ? record.comments_used ?? 0 : 0;
    return used < limit;
}

async function listPoolKeys(): Promise<ApifyKeyRecord[]> {
    const month = currentUsageMonth();
    const keys = await ApifyKey.find({ is_active: true, is_deleted: false }, { sort: { created_at: 1 } });
    return keys.filter((key) => keyHasRemainingQuota(key, month));
}

async function refreshRedisLease(workerId: string, keyId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.set(`${WORKER_LEASE_PREFIX}${workerId}`, keyId, 'EX', LEASE_TTL_SECONDS);
    await redis.set(`${KEY_LEASE_PREFIX}${keyId}`, workerId, 'EX', LEASE_TTL_SECONDS);
}

function refreshLocalLease(workerId: string, keyId: string): void {
    const previousKey = localWorkerToKey.get(workerId);
    if (previousKey && previousKey !== keyId) {
        localKeyToWorker.delete(previousKey);
    }
    localWorkerToKey.set(workerId, keyId);
    localKeyToWorker.set(keyId, workerId);
}

async function readRedisWorkerLease(workerId: string): Promise<string | null> {
    try {
        const redis = getRedisClient();
        if (redis.status !== 'ready') {
            await redis.connect();
        }
        return await redis.get(`${WORKER_LEASE_PREFIX}${workerId}`);
    } catch {
        return localWorkerToKey.get(workerId) || null;
    }
}

async function tryClaimRedisKey(workerId: string, keyId: string): Promise<boolean> {
    try {
        const redis = getRedisClient();
        if (redis.status !== 'ready') {
            await redis.connect();
        }

        const keyLeaseKey = `${KEY_LEASE_PREFIX}${keyId}`;
        const claimed = await redis.set(keyLeaseKey, workerId, 'EX', LEASE_TTL_SECONDS, 'NX');
        if (claimed === 'OK') {
            await refreshRedisLease(workerId, keyId);
            return true;
        }

        const owner = await redis.get(keyLeaseKey);
        if (owner === workerId) {
            await refreshRedisLease(workerId, keyId);
            return true;
        }

        return false;
    } catch {
        const owner = localKeyToWorker.get(keyId);
        if (!owner || owner === workerId) {
            refreshLocalLease(workerId, keyId);
            return true;
        }
        return false;
    }
}

async function loadLeasedKey(keyId: string, month: string): Promise<ApifyKeyRecord | null> {
    const record = await ApifyKey.findOne({ _id: keyId, is_deleted: false });
    if (!record || !record.is_active || !keyHasRemainingQuota(record, month)) {
        return null;
    }
    return record;
}

export async function releaseWorkerApifyLease(workerId: string = getWorkerId()): Promise<void> {
    const leasedKeyId = (await readRedisWorkerLease(workerId)) || localWorkerToKey.get(workerId);
    if (!leasedKeyId) return;

    try {
        const redis = getRedisClient();
        if (redis.status === 'ready') {
            const owner = await redis.get(`${KEY_LEASE_PREFIX}${leasedKeyId}`);
            if (owner === workerId) {
                await redis.del(`${KEY_LEASE_PREFIX}${leasedKeyId}`);
            }
            await redis.del(`${WORKER_LEASE_PREFIX}${workerId}`);
        }
    } catch {
        // fall through to local cleanup
    }

    if (localWorkerToKey.get(workerId) === leasedKeyId) {
        localWorkerToKey.delete(workerId);
    }
    if (localKeyToWorker.get(leasedKeyId) === workerId) {
        localKeyToWorker.delete(leasedKeyId);
    }
}

export async function markApifyKeyExhausted(keyId: string, workerId: string = getWorkerId()): Promise<void> {
    await prisma.apifyKey.update({
        where: { id: keyId },
        data: { is_active: false },
    });
    await releaseWorkerApifyLease(workerId);
}

export async function resolveApifyKeyForWorker(workerId: string = getWorkerId()): Promise<ApifyKeyRecord | null> {
    const month = currentUsageMonth();
    const existingLeaseKeyId = await readRedisWorkerLease(workerId);

    if (existingLeaseKeyId) {
        const leased = await loadLeasedKey(existingLeaseKeyId, month);
        if (leased) {
            await tryClaimRedisKey(workerId, existingLeaseKeyId);
            return leased;
        }
        await releaseWorkerApifyLease(workerId);
    }

    const availableKeys = await listPoolKeys();
    for (const candidate of availableKeys) {
        const keyId = candidate._id || candidate.id;
        if (!keyId) continue;

        const claimed = await tryClaimRedisKey(workerId, keyId);
        if (!claimed) continue;

        const leased = await loadLeasedKey(keyId, month);
        if (leased) return leased;

        await releaseWorkerApifyLease(workerId);
    }

    return null;
}

export async function getApifyLeaseStatus(): Promise<
    Array<{ worker_id: string; key_id: string; key_label: string | null }>
> {
    const leases: Array<{ worker_id: string; key_id: string; key_label: string | null }> = [];

    try {
        const redis = getRedisClient();
        if (redis.status !== 'ready') {
            await redis.connect();
        }

        let cursor = '0';
        do {
            const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${WORKER_LEASE_PREFIX}*`, 'COUNT', 100);
            cursor = nextCursor;

            for (const redisKey of keys) {
                const workerId = redisKey.slice(WORKER_LEASE_PREFIX.length);
                const keyId = await redis.get(redisKey);
                if (!keyId) continue;

                const record = await ApifyKey.findOne({ _id: keyId, is_deleted: false });
                leases.push({
                    worker_id: workerId,
                    key_id: keyId,
                    key_label: record?.label || null,
                });
            }
        } while (cursor !== '0');
    } catch {
        for (const [workerId, keyId] of localWorkerToKey.entries()) {
            const record = await ApifyKey.findOne({ _id: keyId, is_deleted: false });
            leases.push({
                worker_id: workerId,
                key_id: keyId,
                key_label: record?.label || null,
            });
        }
    }

    return leases;
}
