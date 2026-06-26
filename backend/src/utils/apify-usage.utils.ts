import axios from 'axios';
import config from '../config';
import { buildUsageView, type ApiUsageView } from './api-usage-status.utils';

export async function getApifyPlatformUsage(apiToken: string): Promise<ApiUsageView> {
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

        return buildUsageView({
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
    } catch (error: any) {
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
