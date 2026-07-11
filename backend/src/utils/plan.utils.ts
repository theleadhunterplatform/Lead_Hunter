export type PlanId = 'free' | 'paid' | 'enterprise';

export type PlanDefinition = {
    id: PlanId;
    name: string;
    description: string;
    /** Tokens granted / refilled each calendar month */
    monthly_tokens: number;
    /** Tokens spent per lead claim (admins still 0) */
    claim_cost: number;
    /** Max claims per calendar month (-1 = unlimited) */
    max_claims_per_month: number;
    features: string[];
    /** Razorpay amount in paise (INR). 0 / undefined = not for sale */
    price_paise?: number;
    currency?: string;
};

function envPaise(key: string, fallback: number): number {
    const raw = process.env[key];
    if (!raw) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
    free: {
        id: 'free',
        name: 'Free',
        description: 'Starter access for approved hunters.',
        monthly_tokens: 10,
        claim_cost: 1,
        max_claims_per_month: 15,
        features: ['claim_leads', 'google_sheets', 'crm'],
        price_paise: 0,
        currency: 'INR',
    },
    paid: {
        id: 'paid',
        name: 'Paid',
        description: 'Higher monthly claim capacity for active hunters.',
        monthly_tokens: 100,
        claim_cost: 1,
        max_claims_per_month: 100,
        features: ['claim_leads', 'google_sheets', 'crm', 'priority_support'],
        price_paise: envPaise('RAZORPAY_PAID_AMOUNT_PAISE', 99900),
        currency: 'INR',
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Team-scale limits for organizations.',
        monthly_tokens: 500,
        claim_cost: 1,
        max_claims_per_month: -1,
        features: ['claim_leads', 'google_sheets', 'crm', 'priority_support', 'team_seats'],
        price_paise: envPaise('RAZORPAY_ENTERPRISE_AMOUNT_PAISE', 499900),
        currency: 'INR',
    },
};

export function isPlanId(value: unknown): value is PlanId {
    return value === 'free' || value === 'paid' || value === 'enterprise';
}

export function getPlanDefinition(plan: string | null | undefined): PlanDefinition {
    if (isPlanId(plan)) return PLAN_DEFINITIONS[plan];
    return PLAN_DEFINITIONS.free;
}

export function listPlanDefinitions(): PlanDefinition[] {
    return Object.values(PLAN_DEFINITIONS);
}

export function currentPlanMonth(): string {
    return new Date().toISOString().slice(0, 7);
}
