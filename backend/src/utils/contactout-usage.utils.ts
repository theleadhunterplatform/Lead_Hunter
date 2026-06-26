import axios from 'axios';
import config from '../config';
import { getSetting, updateSetting } from '../services/setting.service';
import { buildUsageView, type ApiUsageView } from './api-usage-status.utils';

const USAGE_KEY = 'contactout_api_usage';
const RATE_LIMIT_KEY = 'contactout_rate_limited_at';

type StoredUsage = {
    credits_remaining: number | null;
    credits_limit: number | null;
    updated_at: string;
};

async function getContactOutToken(): Promise<string | null> {
    const fromDb = await getSetting('contactout_api_token');
    return fromDb || config.contactOut?.apiToken || null;
}

async function isRecentlyRateLimited(): Promise<boolean> {
    const raw = await getSetting(RATE_LIMIT_KEY);
    if (!raw || typeof raw !== 'string') return false;
    const at = Date.parse(raw);
    return !Number.isNaN(at) && Date.now() - at < 7 * 24 * 60 * 60 * 1000;
}

export async function markContactOutRateLimited(): Promise<void> {
    await updateSetting(RATE_LIMIT_KEY, new Date().toISOString(), 'ContactOut last rate limit');
}

export async function recordContactOutCredits(creditsRemaining: number | null, creditsLimit?: number | null): Promise<void> {
    const payload: StoredUsage = {
        credits_remaining: creditsRemaining,
        credits_limit: creditsLimit ?? null,
        updated_at: new Date().toISOString(),
    };
    await updateSetting(RATE_LIMIT_KEY, null, 'ContactOut last rate limit');
    await updateSetting(USAGE_KEY, JSON.stringify(payload), 'ContactOut credits snapshot');
}

function parseStored(raw: string | null): StoredUsage | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StoredUsage;
    } catch {
        return null;
    }
}

export async function getContactOutUsage(): Promise<ApiUsageView & { is_configured: boolean }> {
    const token = await getContactOutToken();
    if (!token) {
        return { is_configured: false, ...buildUsageView({ isConfigured: false }) };
    }

    const rateLimited = await isRecentlyRateLimited();
    const stored = parseStored(await getSetting(USAGE_KEY));

    const remaining = stored?.credits_remaining ?? null;
    const limit = stored?.credits_limit ?? null;
    const used = remaining != null && limit != null ? Math.max(0, limit - remaining) : null;

    return {
        is_configured: true,
        ...buildUsageView({
            used,
            limit,
            remaining,
            rateLimited: rateLimited || remaining === 0,
            usage_label: 'Credits',
            extra_note:
                rateLimited || remaining === 0
                    ? 'ContactOut quota exhausted — phone lookups skipped until credits reset.'
                    : stored
                      ? null
                      : 'Usage updates after the next ContactOut API call.',
        }),
    };
}

/** Optional probe — lightweight HEAD-style check not available; skip live probe. */
export async function probeContactOutAccount(): Promise<void> {
    const token = await getContactOutToken();
    if (!token) return;
    try {
        await axios.get('https://api.contactout.com/v1/people/linkedin', {
            params: { profile: 'https://www.linkedin.com/in/contactout', include_phone: false },
            headers: { Accept: 'application/json', token },
            timeout: 8000,
            validateStatus: (s) => s < 500,
        });
    } catch {
        // ignore — usage comes from enrichment responses
    }
}
