import axios from 'axios';
import config from '../config';
import { getSetting, updateSetting } from '../services/setting.service';
import { buildUsageView, type ApiUsageView } from './api-usage-status.utils';

const RATE_LIMIT_KEY = 'apollo_rate_limited_at';

async function getApolloApiKey(): Promise<string | null> {
    const fromDb = await getSetting('apollo_api_key');
    return fromDb || config.apollo?.apiKey || null;
}

async function isRecentlyRateLimited(): Promise<boolean> {
    const raw = await getSetting(RATE_LIMIT_KEY);
    if (!raw || typeof raw !== 'string') return false;
    const at = Date.parse(raw);
    return !Number.isNaN(at) && Date.now() - at < 7 * 24 * 60 * 60 * 1000;
}

export async function markApolloRateLimited(): Promise<void> {
    await updateSetting(RATE_LIMIT_KEY, new Date().toISOString(), 'Apollo last rate limit');
}

export async function getApolloUsage(): Promise<ApiUsageView & { is_configured: boolean }> {
    const apiKey = await getApolloApiKey();
    if (!apiKey) {
        return { is_configured: false, ...buildUsageView({ isConfigured: false }) };
    }

    const rateLimited = await isRecentlyRateLimited();

    try {
        const response = await axios.get('https://api.apollo.io/api/v1/auth/get_current_user', {
            params: { include_credit_usage: true },
            headers: { 'X-Api-Key': apiKey, 'Cache-Control': 'no-cache' },
            timeout: 12000,
        });

        const user = response.data?.user || response.data;
        const creditUsage = user?.credit_usage || user?.team_credit_usage || response.data?.credit_usage;
        const used = creditUsage?.used_credits ?? creditUsage?.credits_used ?? null;
        const limit = creditUsage?.credit_limit ?? creditUsage?.credits_limit ?? creditUsage?.total_credits ?? null;
        const remaining =
            creditUsage?.remaining_credits ??
            creditUsage?.credits_remaining ??
            (used != null && limit != null ? Math.max(0, limit - used) : null);

        const exhaustedByQuota = remaining === 0;
        if (!exhaustedByQuota && !rateLimited) {
            await updateSetting(RATE_LIMIT_KEY, null, 'Apollo last rate limit');
        }

        return {
            is_configured: true,
            ...buildUsageView({
                used: typeof used === 'number' ? used : null,
                limit: typeof limit === 'number' ? limit : null,
                remaining: typeof remaining === 'number' ? remaining : null,
                rateLimited: rateLimited || exhaustedByQuota,
                plan_name: user?.team?.name || user?.email || null,
                usage_label: 'Credits',
                extra_note:
                    rateLimited || exhaustedByQuota
                        ? 'Apollo credits exhausted or API inaccessible on your plan.'
                        : null,
            }),
        };
    } catch (error: any) {
        const msg = error.response?.data?.error || error.response?.data?.message || error.message;
        const is403 = error.response?.status === 403 || String(msg).includes('API_INACCESSIBLE');
        const is429 = error.response?.status === 429;

        return {
            is_configured: true,
            ...buildUsageView({
                rateLimited: rateLimited || is429 || is403,
                usage_label: 'Credits',
                extra_note: is403
                    ? 'Apollo people/match may be blocked on your plan (API_INACCESSIBLE).'
                    : rateLimited || is429
                      ? 'Apollo rate limit or quota reached.'
                      : 'Could not fetch Apollo usage.',
            }),
        };
    }
}
