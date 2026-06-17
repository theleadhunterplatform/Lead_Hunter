import { getSetting, updateSetting } from '../services/setting.service';
import config from '../config';

const USAGE_KEY = 'contact_compass_usage';

type ContactCompassUsage = {
    lookups_used: number;
    usage_month: string;
    credits_left: number | null;
};

function currentUsageMonth(): string {
    return new Date().toISOString().slice(0, 7);
}

function parseUsage(raw: string | null): ContactCompassUsage {
    if (!raw) {
        return { lookups_used: 0, usage_month: currentUsageMonth(), credits_left: null };
    }
    try {
        const parsed = JSON.parse(raw) as Partial<ContactCompassUsage>;
        return {
            lookups_used: parsed.lookups_used ?? 0,
            usage_month: parsed.usage_month ?? currentUsageMonth(),
            credits_left: parsed.credits_left ?? null,
        };
    } catch {
        return { lookups_used: 0, usage_month: currentUsageMonth(), credits_left: null };
    }
}

function syncMonthlyUsage(usage: ContactCompassUsage): ContactCompassUsage {
    const month = currentUsageMonth();
    if (usage.usage_month !== month) {
        return { lookups_used: 0, usage_month: month, credits_left: usage.credits_left };
    }
    return usage;
}

export async function getContactCompassUsage() {
    const raw = await getSetting(USAGE_KEY);
    const usage = syncMonthlyUsage(parseUsage(raw));
    const limit = config.contactCompass.monthlyLookupLimit;

    return {
        lookups_used: usage.lookups_used,
        lookups_limit: limit,
        lookups_remaining: Math.max(0, limit - usage.lookups_used),
        credits_left: usage.credits_left,
        usage_month: usage.usage_month,
    };
}

export async function recordContactCompassLookup(creditsLeft?: number | null) {
    const raw = await getSetting(USAGE_KEY);
    const usage = syncMonthlyUsage(parseUsage(raw));

    await updateSetting(
        USAGE_KEY,
        JSON.stringify({
            lookups_used: usage.lookups_used + 1,
            usage_month: usage.usage_month,
            credits_left: creditsLeft ?? usage.credits_left,
        }),
        'Contact Compass monthly lookup usage'
    );
}
