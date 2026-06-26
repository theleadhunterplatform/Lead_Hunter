import axios from 'axios';
import config from '../config';
import { getSetting, updateSetting } from '../services/setting.service';

const RATE_LIMIT_KEY = 'hunter_rate_limited_at';

async function getHunterApiKey(): Promise<string | null> {
    const fromDb = await getSetting('hunter_api_key');
    if (fromDb) return fromDb;
    return config.hunter?.apiKey || null;
}

export type HunterUsage = {
    is_configured: boolean;
    searches_used: number | null;
    searches_limit: number | null;
    searches_remaining: number | null;
    verifications_used: number | null;
    verifications_limit: number | null;
    verifications_remaining: number | null;
    plan_name: string | null;
    reset_date: string | null;
    exhausted: boolean;
    rate_limited: boolean;
    status: 'active' | 'low' | 'exhausted' | 'not_configured';
};

function usageStatus(searchesRemaining: number | null, verificationsRemaining: number | null, rateLimited: boolean): HunterUsage['status'] {
    if (rateLimited) return 'exhausted';
    if (searchesRemaining == null && verificationsRemaining == null) return 'active';
    const searchesLow = searchesRemaining != null && searchesRemaining <= 0;
    const verificationsLow = verificationsRemaining != null && verificationsRemaining <= 0;
    if (searchesLow && verificationsLow) return 'exhausted';
    if (
        (searchesRemaining != null && searchesRemaining <= 5) ||
        (verificationsRemaining != null && verificationsRemaining <= 5)
    ) {
        return 'low';
    }
    return 'active';
}

async function isRecentlyRateLimited(): Promise<boolean> {
    const raw = await getSetting(RATE_LIMIT_KEY);
    if (!raw || typeof raw !== 'string') return false;
    const at = Date.parse(raw);
    if (Number.isNaN(at)) return false;
    // Keep flag for 7 days or until account API shows quota again
    return Date.now() - at < 7 * 24 * 60 * 60 * 1000;
}

export async function markHunterRateLimited(): Promise<void> {
    await updateSetting(RATE_LIMIT_KEY, new Date().toISOString(), 'Hunter.io last 429 rate limit');
}

export async function clearHunterRateLimited(): Promise<void> {
    await updateSetting(RATE_LIMIT_KEY, null, 'Hunter.io last 429 rate limit');
}

export async function getHunterUsage(): Promise<HunterUsage> {
    const apiKey = await getHunterApiKey();
    if (!apiKey) {
        return {
            is_configured: false,
            searches_used: null,
            searches_limit: null,
            searches_remaining: null,
            verifications_used: null,
            verifications_limit: null,
            verifications_remaining: null,
            plan_name: null,
            reset_date: null,
            exhausted: false,
            rate_limited: false,
            status: 'not_configured',
        };
    }

    const rateLimited = await isRecentlyRateLimited();

    try {
        const response = await axios.get('https://api.hunter.io/v2/account', {
            params: { api_key: apiKey },
            timeout: 12000,
        });

        const data = response.data?.data;
        const searches = data?.requests?.searches;
        const verifications = data?.requests?.verifications;

        const searchesUsed = typeof searches?.used === 'number' ? searches.used : null;
        const searchesAvailable = typeof searches?.available === 'number' ? searches.available : null;
        const verificationsUsed = typeof verifications?.used === 'number' ? verifications.used : null;
        const verificationsAvailable = typeof verifications?.available === 'number' ? verifications.available : null;

        const searchesRemaining =
            searchesUsed != null && searchesAvailable != null
                ? Math.max(0, searchesAvailable - searchesUsed)
                : null;
        const verificationsRemaining =
            verificationsUsed != null && verificationsAvailable != null
                ? Math.max(0, verificationsAvailable - verificationsUsed)
                : null;

        const exhaustedByQuota =
            (searchesRemaining === 0 && (verificationsRemaining == null || verificationsRemaining === 0)) ||
            (verificationsRemaining === 0 && (searchesRemaining == null || searchesRemaining === 0));

        if (!exhaustedByQuota && !rateLimited) {
            await clearHunterRateLimited();
        }

        const status = usageStatus(searchesRemaining, verificationsRemaining, rateLimited || exhaustedByQuota);

        return {
            is_configured: true,
            searches_used: searchesUsed,
            searches_limit: searchesAvailable,
            searches_remaining: searchesRemaining,
            verifications_used: verificationsUsed,
            verifications_limit: verificationsAvailable,
            verifications_remaining: verificationsRemaining,
            plan_name: data?.plan_name ?? null,
            reset_date: data?.reset_date ?? null,
            exhausted: status === 'exhausted',
            rate_limited: rateLimited,
            status,
        };
    } catch (error: any) {
        console.warn('[Hunter] Account usage fetch failed:', error.response?.data || error.message);

        return {
            is_configured: true,
            searches_used: null,
            searches_limit: null,
            searches_remaining: null,
            verifications_used: null,
            verifications_limit: null,
            verifications_remaining: null,
            plan_name: null,
            reset_date: null,
            exhausted: rateLimited,
            rate_limited: rateLimited,
            status: rateLimited ? 'exhausted' : 'active',
        };
    }
}
