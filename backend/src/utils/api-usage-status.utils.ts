export type ApiUsageStatus = 'active' | 'low' | 'exhausted' | 'not_configured';

export type ApiUsageView = {
    status: ApiUsageStatus;
    exhausted: boolean;
    rate_limited: boolean;
    used: number | null;
    limit: number | null;
    remaining: number | null;
    secondary_used?: number | null;
    secondary_limit?: number | null;
    secondary_remaining?: number | null;
    secondary_label?: string;
    plan_name?: string | null;
    reset_date?: string | null;
    usage_label?: string;
    extra_note?: string | null;
};

export function computeUsageStatus(
    remaining: number | null,
    rateLimited: boolean,
    lowThreshold = 5
): ApiUsageStatus {
    if (rateLimited || remaining === 0) return 'exhausted';
    if (remaining != null && remaining <= lowThreshold) return 'low';
    return 'active';
}

export function buildUsageView(input: {
    used?: number | null;
    limit?: number | null;
    remaining?: number | null;
    rateLimited?: boolean;
    isConfigured?: boolean;
    secondary?: { used?: number | null; limit?: number | null; remaining?: number | null; label: string };
    plan_name?: string | null;
    reset_date?: string | null;
    usage_label?: string;
    extra_note?: string | null;
}): ApiUsageView {
    if (input.isConfigured === false) {
        return {
            status: 'not_configured',
            exhausted: false,
            rate_limited: false,
            used: null,
            limit: null,
            remaining: null,
        };
    }

    const used = input.used ?? null;
    const limit = input.limit ?? null;
    const remaining =
        input.remaining ??
        (used != null && limit != null ? Math.max(0, limit - used) : null);
    const rateLimited = input.rateLimited === true;
    const status = computeUsageStatus(remaining, rateLimited);

    return {
        status,
        exhausted: status === 'exhausted',
        rate_limited: rateLimited,
        used,
        limit,
        remaining,
        secondary_used: input.secondary?.used ?? null,
        secondary_limit: input.secondary?.limit ?? null,
        secondary_remaining: input.secondary?.remaining ?? null,
        secondary_label: input.secondary?.label,
        plan_name: input.plan_name ?? null,
        reset_date: input.reset_date ?? null,
        usage_label: input.usage_label,
        extra_note: input.extra_note ?? null,
    };
}
