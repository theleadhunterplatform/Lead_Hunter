import axios from 'axios';
import config from '../config';
import { buildUsageView, type ApiUsageView } from './api-usage-status.utils';

// Cache platform limits per token for 10 minutes to avoid hitting Apify REST rate limits (HTTP 429)
const platformUsageCache = new Map<string, { data: ApiUsageView; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getApifyPlatformUsage(apiToken: string): Promise<ApiUsageView> {
    const cached = platformUsageCache.get(apiToken);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
    }

    try {
        const response = await axios.get('https://api.apify.com/v2/users/me/limits', {
            headers: { Authorization: `Bearer ${apiToken}` },
            timeout: 12000,
        });

        const data = response.data?.data;
        const limits = data?.limits;
        const current = data?.current;
        const maxUsd = limits?.maxMonthlyUsageUsd ?? null;
        const usedUsd = current?.monthlyUsageUsd ?? null;
        const remainingUsd =
            maxUsd != null && usedUsd != null ? Math.max(0, maxUsd - usedUsd) : null;

        const endAt = data?.monthlyUsageCycle?.endAt ?? null;

        const view = buildUsageView({
            used: usedUsd,
            limit: maxUsd,
            remaining: remainingUsd,
            usage_label: 'Monthly spend (USD)',
            reset_date: endAt,
            extra_note:
                remainingUsd === 0
                    ? 'Apify monthly usage limit reached — scraping may stop until reset.'
                    : null,
        });

        platformUsageCache.set(apiToken, { data: view, expiresAt: Date.now() + CACHE_TTL_MS });
        return view;
    } catch (error: any) {
        if (cached) {
            return cached.data;
        }
        return buildUsageView({
            extra_note: 'Could not fetch Apify platform limits.',
        });
    }
}

export function getApifyCommentUsageView(key: {
    comments_used?: number;
    comments_limit?: number;
    comments_remaining?: number;
}): ApiUsageView {
    const limit = key.comments_limit ?? config.apify.monthlyCommentLimit;
    const used = key.comments_used ?? 0;
    const remaining = key.comments_remaining ?? Math.max(0, limit - used);

    return buildUsageView({
        used,
        limit,
        remaining,
        usage_label: 'Comment scrapes',
        extra_note:
            remaining === 0 ? 'Monthly comment scrape limit reached for this key.' : null,
    });
}
